(function() {
	//#region src/constants.js
	var COLORS = [
		"red",
		"blue",
		"green",
		"yellow"
	];
	//#endregion
	//#region src/model.js
	function generateId() {
		return Math.random().toString(36).substring(2, 9);
	}
	function createDeck() {
		const deck = [];
		COLORS.forEach(function(color) {
			deck.push({
				id: generateId(),
				type: "number",
				color,
				value: 0
			});
			for (let i = 1; i <= 9; i++) {
				deck.push({
					id: generateId(),
					type: "number",
					color,
					value: i
				});
				deck.push({
					id: generateId(),
					type: "number",
					color,
					value: i
				});
			}
			for (let i = 0; i < 2; i++) {
				deck.push({
					id: generateId(),
					type: "skip",
					color,
					value: null
				});
				deck.push({
					id: generateId(),
					type: "reverse",
					color,
					value: null
				});
				deck.push({
					id: generateId(),
					type: "draw2",
					color,
					value: null
				});
			}
		});
		for (let i = 0; i < 4; i++) {
			deck.push({
				id: generateId(),
				type: "wild",
				color: null,
				value: null
			});
			deck.push({
				id: generateId(),
				type: "wild_draw4",
				color: null,
				value: null
			});
		}
		return deck;
	}
	function shuffleDeck(deck) {
		for (let i = deck.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			const temp = deck[i];
			deck[i] = deck[j];
			deck[j] = temp;
		}
		return deck;
	}
	function canPlayCard(playCard, currentCard, currentPenalty = 0) {
		if (currentPenalty > 0) return playCard.type === currentCard.type;
		if (playCard.type === "wild" || playCard.type === "wild_draw4") return true;
		if (playCard.color === currentCard.color) return true;
		if (playCard.type === "number" && currentCard.type === "number" && playCard.value === currentCard.value) return true;
		if (playCard.type !== "number" && playCard.type === currentCard.type) return true;
		return false;
	}
	function getCardName(card) {
		if (!card) return "";
		if (card.type === "wild") return "ワイルド";
		if (card.type === "wild_draw4") return "ワイルド ドロー4";
		let colorName = "";
		switch (card.color) {
			case "red":
				colorName = "赤";
				break;
			case "blue":
				colorName = "青";
				break;
			case "green":
				colorName = "緑";
				break;
			case "yellow":
				colorName = "黄";
				break;
		}
		let valueName = "";
		if (card.type === "number") valueName = card.value;
		else if (card.type === "skip") valueName = "スキップ";
		else if (card.type === "reverse") valueName = "リバース";
		else if (card.type === "draw2") valueName = "ドロー2";
		return `${colorName}の${valueName}`;
	}
	//#endregion
	//#region src/view.js
	function injectStyles() {
		if (document.getElementById("uno-styles")) return;
		const style = document.createElement("style");
		style.id = "uno-styles";
		style.innerHTML = `
        #uno-game-container { font-family: sans-serif; background: #2c3e50; padding: 20px; border-radius: 10px; color: white; transition: background-color 0.5s; }
        
        /* 危険モード（背景点滅） */
        #uno-game-container.danger-mode { animation: bgDanger 2s infinite; border: 2px solid #e74c3c; box-shadow: 0 0 20px rgba(231,76,60,0.5); }
        
        .uno-field { display: flex; justify-content: center; margin-bottom: 40px; padding: 20px; background: rgba(0,0,0,0.2); border-radius: 10px; perspective: 1000px; }
        .uno-hand { display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; }
        .uno-card {
            width: 80px; height: 120px; border-radius: 8px; border: 4px solid white;
            box-shadow: 0 4px 8px rgba(0,0,0,0.3); display: flex; justify-content: center; align-items: center;
            font-size: 32px; font-weight: bold; color: white; text-shadow: 1px 1px 2px black;
            cursor: pointer; transition: transform 0.2s, box-shadow 0.2s; user-select: none;
            position: relative;
        }
        .uno-card:hover { transform: translateY(-15px) scale(1.05); box-shadow: 0 10px 20px rgba(0,0,0,0.5); z-index: 10; }
        .uno-card.red { background-color: #e74c3c; }
        .uno-card.blue { background-color: #3498db; }
        .uno-card.green { background-color: #2ecc71; }
        .uno-card.yellow { background-color: #f1c40f; }
        .uno-card.wild { background-color: #2c3e50; background-image: conic-gradient(#e74c3c 90deg, #3498db 90deg 180deg, #2ecc71 180deg 270deg, #f1c40f 270deg); }

        /* --- アニメーション定義 --- */
        
        @keyframes dropIn {
            0% { transform: translateZ(200px) translateY(-100px) rotateX(45deg) scale(2); opacity: 0; box-shadow: 0 30px 60px rgba(0,0,0,0.5); }
            60% { transform: translateZ(0) translateY(10px) rotateX(-10deg) scale(0.9); opacity: 1; }
            100% { transform: translateZ(0) translateY(0) rotateX(0) scale(1); box-shadow: 0 4px 8px rgba(0,0,0,0.3); }
        }
        
        @keyframes pulseDanger {
            0% { box-shadow: 0 0 0 0 rgba(231, 76, 60, 0.8); }
            70% { box-shadow: 0 0 0 20px rgba(231, 76, 60, 0); }
            100% { box-shadow: 0 0 0 0 rgba(231, 76, 60, 0); }
        }
        
        @keyframes shakeAndScale {
            0%, 100% { transform: translateX(0) scale(1); }
            10%, 30%, 50%, 70%, 90% { transform: translateX(-5px) scale(1.05); color: #ff4757; }
            20%, 40%, 60%, 80% { transform: translateX(5px) scale(1.05); color: #ff6b81; }
        }
        
        @keyframes bgDanger {
            0%, 100% { background-color: #2c3e50; }
            50% { background-color: #4a2323; }
        }

        /* ★ NEW: UNOカットイン用アニメーション */
        .uno-cutin-overlay {
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            background: rgba(0, 0, 0, 0.75); z-index: 10000;
            display: flex; justify-content: center; align-items: center;
            animation: fadeOutCutin 3s forwards; pointer-events: none;
        }
        .uno-cutin-text {
            font-size: 8vw; font-weight: 900; color: #f1c40f; font-style: italic;
            text-shadow: 0 0 30px #e74c3c, 8px 8px 0px #c0392b;
            transform: scale(0) rotate(-15deg);
            animation: zoomInRotate 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards, floatText 2s 0.5s infinite;
        }
        @keyframes zoomInRotate {
            to { transform: scale(1) rotate(-5deg); }
        }
        @keyframes floatText {
            0%, 100% { transform: scale(1) rotate(-5deg); }
            50% { transform: scale(1.05) rotate(-3deg); }
        }
        @keyframes fadeOutCutin {
            0%, 70% { opacity: 1; }
            100% { opacity: 0; display: none; }
        }
        
        .animate-drop { animation: dropIn 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
        .danger-text { animation: shakeAndScale 1.5s infinite; font-size: 28px !important; text-shadow: 0 0 10px rgba(255,71,87,0.5); margin: 15px 0; display: inline-block; }
        .btn-danger-pulse { animation: pulseDanger 1.5s infinite; }
    `;
		document.head.appendChild(style);
	}
	function createCardHTML(card) {
		if (!card) return "";
		let colorClass = card.color ? card.color : "wild";
		let displayValue = card.value !== null ? card.value : "";
		if (card.type === "skip") displayValue = "⊘";
		if (card.type === "reverse") displayValue = "⇄";
		if (card.type === "draw2") displayValue = "+2";
		if (card.type === "wild") displayValue = "W";
		if (card.type === "wild_draw4") displayValue = "+4";
		return `<div class="uno-card ${colorClass}" data-id="${card.id}">${displayValue}</div>`;
	}
	function showColorSelector(callback) {
		const overlay = document.createElement("div");
		overlay.style.position = "fixed";
		overlay.style.top = "0";
		overlay.style.left = "0";
		overlay.style.width = "100%";
		overlay.style.height = "100%";
		overlay.style.backgroundColor = "rgba(0,0,0,0.8)";
		overlay.style.display = "flex";
		overlay.style.justifyContent = "center";
		overlay.style.alignItems = "center";
		overlay.style.zIndex = "9999";
		const modal = document.createElement("div");
		modal.style.backgroundColor = "#fff";
		modal.style.padding = "30px";
		modal.style.borderRadius = "12px";
		modal.style.textAlign = "center";
		modal.style.boxShadow = "0 10px 25px rgba(0,0,0,0.5)";
		modal.innerHTML = "<h3 style=\"color:#333; margin-top:0; margin-bottom: 20px; font-size: 24px;\">指定する色を選んでください</h3>";
		const colors = [
			{
				id: "red",
				hex: "#e74c3c",
				name: "赤"
			},
			{
				id: "blue",
				hex: "#3498db",
				name: "青"
			},
			{
				id: "green",
				hex: "#2ecc71",
				name: "緑"
			},
			{
				id: "yellow",
				hex: "#f1c40f",
				name: "黄"
			}
		];
		const btnContainer = document.createElement("div");
		btnContainer.style.display = "flex";
		btnContainer.style.gap = "15px";
		btnContainer.style.justifyContent = "center";
		colors.forEach((c) => {
			const btn = document.createElement("button");
			btn.innerText = c.name;
			btn.style.backgroundColor = c.hex;
			btn.style.color = "white";
			btn.style.border = "2px solid rgba(255,255,255,0.5)";
			btn.style.padding = "20px 30px";
			btn.style.fontSize = "20px";
			btn.style.fontWeight = "bold";
			btn.style.borderRadius = "8px";
			btn.style.cursor = "pointer";
			btn.style.boxShadow = "0 4px 6px rgba(0,0,0,0.2)";
			btn.addEventListener("click", () => {
				document.body.removeChild(overlay);
				callback(c.id);
			});
			btnContainer.appendChild(btn);
		});
		modal.appendChild(btnContainer);
		overlay.appendChild(modal);
		document.body.appendChild(overlay);
	}
	function renderGameBoard(spaceEl, { currentCard, myHand, myPlayerIndex, myPlayerName, deckCount, turnPlayerName, currentTurnIndex, currentDirection, currentPenalty, winnerName, unoCaller, opponents, hasPlayableCard }) {
		const existingContainer = document.getElementById("uno-game-container");
		if (existingContainer) existingContainer.remove();
		injectStyles();
		const container = document.createElement("div");
		container.id = "uno-game-container";
		if (currentPenalty > 0 && currentTurnIndex !== -1 && myPlayerIndex === currentTurnIndex) container.classList.add("danger-mode");
		const directionText = currentDirection === 1 ? "🔄 時計回り" : "🔁 反時計回り";
		let opponentsHTML = "";
		if (opponents && opponents.length > 0) opponentsHTML = `
            <div style="text-align:center; margin-bottom: 20px;">
                <p style="margin: 0 0 10px 0; font-size: 14px; color: #7f8c8d; font-weight: bold;">👥 他プレイヤーの手札状況</p>
                ${opponents.map((op) => {
			let isTurn = op.index === currentTurnIndex ? "<span style=\"color:#00ff7f;\">▶</span> " : "";
			let countColor = op.handCount <= 2 ? "#e74c3c" : "#f1c40f";
			return `<div style="display:inline-block; margin: 0 10px; padding: 10px 20px; background: rgba(0,0,0,0.3); border-radius: 8px; border: 1px solid rgba(255,255,255,0.1);">
                <span style="color: #ecf0f1; font-weight: bold; margin-right: 10px;">${isTurn}${op.name}:</span> 
                <span style="font-weight: bold; font-size: 20px; color: ${countColor};">${op.handCount} <span style="font-size: 14px; color: #bdc3c7;">枚</span></span>
            </div>`;
		}).join("")}
            </div>
        `;
		let playerAreaHTML = "";
		if (myPlayerIndex !== -1) {
			let handHTML = myHand.map((card) => createCardHTML(card)).join("");
			let btnHTML = "";
			if (currentTurnIndex === -1) btnHTML = `<div style="color: #f1c40f; font-weight: bold; font-size: 20px;">🏆 このゲームは決着がつきました！お疲れ様でした。</div>`;
			else if (myPlayerIndex === currentTurnIndex) {
				let unoBtnHTML = "";
				if (myHand.length === 2 && hasPlayableCard) unoBtnHTML = `
                    <button id="uno-call-btn" style="padding: 12px 30px; margin-right: 15px; font-size: 16px; background-color: #9b59b6; color: white; border: 2px solid white; border-radius: 8px; font-weight: bold; cursor: pointer; box-shadow: 0 4px 6px rgba(0,0,0,0.5);">
                        📢 UNOと宣言する！
                    </button>
                `;
				if (currentPenalty > 0) btnHTML = `
                    ${unoBtnHTML}
                    <button id="draw-pass-btn" class="btn-danger-pulse" style="padding: 12px 30px; font-size: 16px; background-color: #e74c3c; color: white; border: 2px solid white; border-radius: 8px; font-weight: bold; cursor: pointer;">
                        🚨 ペナルティ ${currentPenalty} 枚引いてターン終了
                    </button>
                `;
				else btnHTML = `
                    ${unoBtnHTML}
                    <button id="draw-pass-btn" style="padding: 12px 30px; font-size: 16px; background-color: #f39c12; color: white; border: 2px solid white; border-radius: 8px; font-weight: bold; cursor: pointer; box-shadow: 0 4px 6px rgba(0,0,0,0.5);">
                        🔄 山札から1枚引く
                    </button>
                `;
			} else btnHTML = `<div style="color: #bdc3c7; font-weight: bold;">⏳ 相手のターンを待っています...</div>`;
			playerAreaHTML = `
            <div style="text-align:center; margin-bottom: 10px; font-weight:bold;">あなたの手札 (${myPlayerName})</div>
            <div class="uno-hand">
                ${handHTML}
            </div>
            <div style="text-align:center; margin-top: 30px;">
                ${btnHTML}
            </div>
        `;
		} else playerAreaHTML = `<div style="text-align:center; font-weight:bold; color:#f39c12;">あなたは観戦者です（手札はありません）</div>`;
		container.innerHTML = `
        <div style="text-align:center; margin-bottom: 20px;">
            <h2>UNO Game Board</h2>
            ${currentTurnIndex === -1 ? `<h3 style="color:#f1c40f; font-size: 36px; text-shadow: 2px 2px 4px black; margin: 15px 0;">👑 優勝: ${winnerName} 👑</h3><p style="color:#bdc3c7;">ゲーム終了</p>` : `<p>現在のターン: <span style="color:#00ff7f; font-weight:bold;">${turnPlayerName}</span> / 山札残り: ${deckCount}枚 / ${directionText}</p>`}
            ${currentPenalty > 0 && currentTurnIndex !== -1 ? `<p class="danger-text" style="color:#e74c3c; font-weight:bold;">⚠️ ドロー累積: ${currentPenalty}枚！出せるカードがなければ引いてください</p>` : ""}
        </div>
        
        ${opponentsHTML}
        
        <div class="uno-field">
            <div style="text-align:center;">
                <p style="margin:0 0 10px 0; font-weight:bold;">現在の場札</p>
                <div class="animate-drop">
                    ${createCardHTML(currentCard)}
                </div>
            </div>
        </div>
        
        ${playerAreaHTML}
    `;
		spaceEl.appendChild(container);
		if (unoCaller) {
			const cutin = document.createElement("div");
			cutin.className = "uno-cutin-overlay";
			cutin.innerHTML = `<div class="uno-cutin-text">${unoCaller} が UNO!!</div>`;
			document.body.appendChild(cutin);
			setTimeout(() => {
				if (cutin.parentNode) cutin.parentNode.removeChild(cutin);
			}, 3e3);
		}
		return container;
	}
	//#endregion
	//#region src/main.js
	(function() {
		"use strict";
		kintone.events.on("app.record.detail.show", function(event) {
			const record = event.record;
			[
				"GameID",
				"Current_Card",
				"Deck_Count",
				"Turn_Index",
				"Players",
				"Deck_Data",
				"Player0_Hand",
				"Player1_Hand",
				"Player2_Hand"
			].forEach(function(fieldCode) {
				kintone.app.record.setFieldShown(fieldCode, false);
			});
			if (!record.Deck_Data || !record.Deck_Data.value) {
				let deck = createDeck();
				deck = shuffleDeck(deck);
				const playersHands = {
					player0: [],
					player1: [],
					player2: []
				};
				for (let i = 0; i < 7; i++) {
					playersHands.player0.push(deck.pop());
					playersHands.player1.push(deck.pop());
					playersHands.player2.push(deck.pop());
				}
				let initialCard = null;
				while (true) {
					initialCard = deck.pop();
					if (initialCard.type !== "number") deck.unshift(initialCard);
					else break;
				}
				const updateParams = {
					app: kintone.app.getId(),
					id: kintone.app.record.getId(),
					record: {
						Current_Card: { value: JSON.stringify(initialCard) },
						Deck_Count: { value: deck.length },
						Deck_Data: { value: JSON.stringify(deck) },
						Player0_Hand: { value: JSON.stringify(playersHands.player0) },
						Player1_Hand: { value: JSON.stringify(playersHands.player1) },
						Player2_Hand: { value: JSON.stringify(playersHands.player2) },
						Turn_Index: { value: 0 }
					}
				};
				kintone.api(kintone.api.url("/k/v1/record.json", true), "PUT", updateParams).then(function() {
					location.reload();
				});
				return event;
			}
			const spaceEl = kintone.app.record.getSpaceElement("game_board_space");
			if (!spaceEl) return event;
			spaceEl.innerHTML = "";
			const loginUser = kintone.getLoginUser();
			const players = record.Players && record.Players.value ? record.Players.value : [];
			let myPlayerIndex = -1;
			let myPlayerName = "";
			players.forEach(function(p, index) {
				if (p.code === loginUser.code) {
					myPlayerIndex = index;
					myPlayerName = p.name;
				}
			});
			const currentTurnIndex = record.Turn_Index && record.Turn_Index.value !== void 0 ? Number(record.Turn_Index.value) : 0;
			const currentCard = JSON.parse(record.Current_Card.value || "null");
			let currentDirection = currentCard && currentCard.direction !== void 0 ? currentCard.direction : 1;
			let currentPenalty = currentCard && currentCard.penalty !== void 0 ? currentCard.penalty : 0;
			let unoCaller = currentCard && currentCard.unoCallTrigger ? currentCard.unoCallTrigger : null;
			let myHandStr = "[]";
			if (myPlayerIndex === 0) myHandStr = record.Player0_Hand.value;
			if (myPlayerIndex === 1) myHandStr = record.Player1_Hand.value;
			if (myPlayerIndex === 2) myHandStr = record.Player2_Hand.value;
			const myHand = JSON.parse(myHandStr || "[]");
			const player0Hand = JSON.parse(record.Player0_Hand && record.Player0_Hand.value ? record.Player0_Hand.value : "[]");
			const player1Hand = JSON.parse(record.Player1_Hand && record.Player1_Hand.value ? record.Player1_Hand.value : "[]");
			const player2Hand = JSON.parse(record.Player2_Hand && record.Player2_Hand.value ? record.Player2_Hand.value : "[]");
			const opponents = [];
			players.forEach(function(p, index) {
				if (index !== myPlayerIndex) {
					let handCount = 0;
					if (index === 0) handCount = player0Hand.length;
					if (index === 1) handCount = player1Hand.length;
					if (index === 2) handCount = player2Hand.length;
					opponents.push({
						name: p.name,
						index,
						handCount
					});
				}
			});
			const deckCount = record.Deck_Count && record.Deck_Count.value !== void 0 ? record.Deck_Count.value : 0;
			let turnPlayerName = "";
			let winnerName = "";
			if (currentTurnIndex === -1) {
				turnPlayerName = "🎊 ゲーム終了 🎊";
				if (player0Hand.length === 0) winnerName = players[0] ? players[0].name : "Player 1";
				else if (player1Hand.length === 0) winnerName = players[1] ? players[1].name : "Player 2";
				else if (player2Hand.length === 0) winnerName = players[2] ? players[2].name : "Player 3";
			} else turnPlayerName = players[currentTurnIndex] ? players[currentTurnIndex].name : `Player ${currentTurnIndex}`;
			let hasPlayableCard = false;
			if (myHand.length === 2 && myPlayerIndex === currentTurnIndex) hasPlayableCard = myHand.some((card) => canPlayCard(card, currentCard, currentPenalty));
			const container = renderGameBoard(spaceEl, {
				currentCard,
				myHand,
				myPlayerIndex,
				myPlayerName,
				deckCount,
				turnPlayerName,
				currentTurnIndex,
				currentDirection,
				currentPenalty,
				winnerName,
				unoCaller,
				opponents,
				hasPlayableCard
			});
			if (myPlayerIndex !== -1 && currentTurnIndex !== -1) {
				let hasCalledUno = false;
				function saveGameData(updateRecord) {
					const updateParams = {
						app: kintone.app.getId(),
						id: kintone.app.record.getId(),
						record: updateRecord
					};
					kintone.api(kintone.api.url("/k/v1/record.json", true), "PUT", updateParams).then(function() {
						location.reload();
					}).catch(function(error) {
						console.error(error);
						alert("エラーが発生しました。もう一度お試しください。");
					});
				}
				function setHandToUpdateRecord(updateRecord, playerIndex, handData) {
					if (playerIndex === 0) updateRecord.Player0_Hand = { value: JSON.stringify(handData) };
					if (playerIndex === 1) updateRecord.Player1_Hand = { value: JSON.stringify(handData) };
					if (playerIndex === 2) updateRecord.Player2_Hand = { value: JSON.stringify(handData) };
				}
				function executePlayCard(originalCard, cardToPutOnField) {
					const newHand = myHand.filter((c) => c.id !== originalCard.id);
					let deck = JSON.parse(record.Deck_Data.value || "[]");
					let penaltyApplied = false;
					if (myHand.length === 2 && newHand.length === 1 && !hasCalledUno) {
						alert("🚨 UNOと宣言せずに残り1枚になりました！ペナルティとして山札から2枚引かされます。");
						for (let i = 0; i < 2; i++) if (deck.length > 0) newHand.push(deck.pop());
						penaltyApplied = true;
						delete cardToPutOnField.unoCallTrigger;
					} else if (myHand.length === 2 && newHand.length === 1 && hasCalledUno) cardToPutOnField.unoCallTrigger = myPlayerName;
					else delete cardToPutOnField.unoCallTrigger;
					let nextTurnIndex = currentTurnIndex;
					if (newHand.length === 0) {
						alert(`🎉 おめでとうございます！\n${myPlayerName} が手札をすべて出し切って勝利しました！`);
						nextTurnIndex = -1;
					} else {
						let nextDirection = currentDirection;
						let skipCount = 1;
						if (cardToPutOnField.type === "reverse") nextDirection = nextDirection * -1;
						if (cardToPutOnField.type === "skip") skipCount = 2;
						if (cardToPutOnField.type === "draw2") cardToPutOnField.penalty = currentPenalty + 2;
						else if (cardToPutOnField.type === "wild_draw4") cardToPutOnField.penalty = currentPenalty + 4;
						else cardToPutOnField.penalty = 0;
						cardToPutOnField.direction = nextDirection;
						nextTurnIndex = (currentTurnIndex + nextDirection * skipCount + 3) % 3;
					}
					const updateRecord = {
						Current_Card: { value: JSON.stringify(cardToPutOnField) },
						Turn_Index: { value: nextTurnIndex }
					};
					if (penaltyApplied) {
						updateRecord.Deck_Data = { value: JSON.stringify(deck) };
						updateRecord.Deck_Count = { value: deck.length };
					}
					setHandToUpdateRecord(updateRecord, myPlayerIndex, newHand);
					saveGameData(updateRecord);
				}
				container.querySelectorAll(".uno-hand .uno-card").forEach((cardEl) => {
					cardEl.addEventListener("click", function() {
						if (myPlayerIndex !== currentTurnIndex) {
							alert("今はあなたのターンではありません！");
							return;
						}
						const cardId = this.getAttribute("data-id");
						const selectedCard = myHand.find((c) => c.id === cardId);
						if (!selectedCard) return;
						if (canPlayCard(selectedCard, currentCard, currentPenalty)) {
							if (selectedCard.type === "wild" || selectedCard.type === "wild_draw4") showColorSelector(function(selectedColor) {
								const playedCard = Object.assign({}, selectedCard);
								playedCard.color = selectedColor;
								executePlayCard(selectedCard, playedCard);
							});
							else if (confirm("このカードを出しますか？")) executePlayCard(selectedCard, selectedCard);
						} else alert("このカードは出せません！\n場札と同じ色、または同じ数字・記号を選んでください。");
					});
				});
				const passBtn = document.getElementById("draw-pass-btn");
				if (passBtn) passBtn.addEventListener("click", function() {
					if (myPlayerIndex !== currentTurnIndex) {
						alert("今はあなたのターンではありません！相手のターンを待ってください。");
						return;
					}
					if (currentPenalty > 0) {
						if (confirm(`重ねて出せるカードがありませんか？\nペナルティとして ${currentPenalty} 枚引いてターンを終了します。`)) {
							let deck = JSON.parse(record.Deck_Data.value || "[]");
							for (let i = 0; i < currentPenalty; i++) if (deck.length > 0) myHand.push(deck.pop());
							const nextTurn = (currentTurnIndex + currentDirection + 3) % 3;
							const resetCard = Object.assign({}, currentCard);
							resetCard.penalty = 0;
							delete resetCard.unoCallTrigger;
							const updateRecord = {
								Current_Card: { value: JSON.stringify(resetCard) },
								Deck_Data: { value: JSON.stringify(deck) },
								Deck_Count: { value: deck.length },
								Turn_Index: { value: nextTurn }
							};
							setHandToUpdateRecord(updateRecord, myPlayerIndex, myHand);
							saveGameData(updateRecord);
						}
						return;
					}
					let deck = JSON.parse(record.Deck_Data.value || "[]");
					if (deck.length === 0) {
						alert("山札がありません！");
						return;
					}
					const drawCard = deck.pop();
					const nextTurn = (currentTurnIndex + currentDirection + 3) % 3;
					const cardName = getCardName(drawCard);
					const updateRecord = {
						Deck_Data: { value: JSON.stringify(deck) },
						Deck_Count: { value: deck.length },
						Turn_Index: { value: nextTurn }
					};
					if (canPlayCard(drawCard, currentCard, 0)) {
						if (confirm(`引いたカードは「${cardName}」でした！\nこのカードはすぐに出すことができます。出しますか？\n（キャンセルを選ぶと手札に加えてパスします）`)) {
							let nextDirection = currentDirection;
							let skipCount = 1;
							if (drawCard.type === "reverse") nextDirection = nextDirection * -1;
							if (drawCard.type === "skip") skipCount = 2;
							let nextPenalty = 0;
							if (drawCard.type === "draw2") nextPenalty = currentPenalty + 2;
							else if (drawCard.type === "wild_draw4") nextPenalty = currentPenalty + 4;
							const actualNextTurn = (currentTurnIndex + nextDirection * skipCount + 3) % 3;
							if (myHand.length === 0) {
								alert(`🎉 おめでとうございます！\n${myPlayerName} が引いたカードを出して手札をすべて出し切り、勝利しました！`);
								updateRecord.Turn_Index = { value: -1 };
							} else updateRecord.Turn_Index = { value: actualNextTurn };
							if (drawCard.type === "wild" || drawCard.type === "wild_draw4") {
								showColorSelector(function(selectedColor) {
									const playedCard = Object.assign({}, drawCard);
									playedCard.color = selectedColor;
									playedCard.direction = nextDirection;
									playedCard.penalty = nextPenalty;
									delete playedCard.unoCallTrigger;
									updateRecord.Current_Card = { value: JSON.stringify(playedCard) };
									setHandToUpdateRecord(updateRecord, myPlayerIndex, myHand);
									saveGameData(updateRecord);
								});
								return;
							} else {
								drawCard.direction = nextDirection;
								drawCard.penalty = nextPenalty;
								delete drawCard.unoCallTrigger;
								updateRecord.Current_Card = { value: JSON.stringify(drawCard) };
								setHandToUpdateRecord(updateRecord, myPlayerIndex, myHand);
								saveGameData(updateRecord);
								return;
							}
						}
					} else alert(`引いたカードは「${cardName}」でした。\n場に出せないため、手札に加えてターンを終了します。`);
					myHand.push(drawCard);
					setHandToUpdateRecord(updateRecord, myPlayerIndex, myHand);
					const currentCardObj = JSON.parse(record.Current_Card.value || "{}");
					if (currentCardObj.unoCallTrigger) {
						delete currentCardObj.unoCallTrigger;
						updateRecord.Current_Card = { value: JSON.stringify(currentCardObj) };
					}
					saveGameData(updateRecord);
				});
				const unoBtn = document.getElementById("uno-call-btn");
				if (unoBtn) unoBtn.addEventListener("click", function() {
					hasCalledUno = true;
					unoBtn.innerText = "✅ UNO宣言済み！";
					unoBtn.style.backgroundColor = "#2ecc71";
					unoBtn.disabled = true;
				});
			}
			const currentRevision = record["$revision"].value;
			if (window.unoPollingTimer) clearInterval(window.unoPollingTimer);
			window.unoPollingTimer = setInterval(function() {
				kintone.api(kintone.api.url("/k/v1/record.json", true), "GET", {
					app: kintone.app.getId(),
					id: kintone.app.record.getId()
				}).then(function(resp) {
					const fetchedRevision = resp.record["$revision"].value;
					if (Number(fetchedRevision) > Number(currentRevision)) {
						console.log("他プレイヤーの操作を検知しました！画面を更新します。");
						location.reload();
					}
				}).catch(function(err) {});
			}, 3e3);
			return event;
		});
	})();
	//#endregion
})();
