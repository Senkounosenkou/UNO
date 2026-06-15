/**
 * UNO Game Board - メインロジック
 * 初期化（カード配布）および、ゲーム画面(UI)の描画を行う
 */

(function() {
    'use strict';

    // ==========================================
    // 1. UNOカード生成・シャッフルロジック
    // ==========================================
    function createDeck() {
        const deck = [];
        const colors = ['red', 'blue', 'green', 'yellow'];
        
        colors.forEach(function(color) {
            deck.push({ id: generateId(), type: 'number', color: color, value: 0 });
            for (let i = 1; i <= 9; i++) {
                deck.push({ id: generateId(), type: 'number', color: color, value: i });
                deck.push({ id: generateId(), type: 'number', color: color, value: i });
            }
            for (let i = 0; i < 2; i++) {
                deck.push({ id: generateId(), type: 'skip', color: color, value: null });
                deck.push({ id: generateId(), type: 'reverse', color: color, value: null });
                deck.push({ id: generateId(), type: 'draw2', color: color, value: null });
            }
        });
        
        for (let i = 0; i < 4; i++) {
            deck.push({ id: generateId(), type: 'wild', color: null, value: null });
            deck.push({ id: generateId(), type: 'wild_draw4', color: null, value: null });
        }
        return deck;
    }

    function generateId() {
        return Math.random().toString(36).substring(2, 9);
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

    // ==========================================
    // 2. UI描画・判定用ヘルパー関数
    // ==========================================
    function injectStyles() {
        if (document.getElementById('uno-styles')) return;
        const style = document.createElement('style');
        style.id = 'uno-styles';
        style.innerHTML = `
            #uno-game-container { font-family: sans-serif; background: #2c3e50; padding: 20px; border-radius: 10px; color: white; transition: background-color 0.5s; }
            
            /* ★NEW: 危険モード（背景点滅） */
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

            /* ==========================================
               ★NEW: アニメーション定義 (Keyframes)
               ========================================== */
            
            /* 1. カード叩きつけエフェクト */
            @keyframes dropIn {
                0% { transform: translateZ(200px) translateY(-100px) rotateX(45deg) scale(2); opacity: 0; box-shadow: 0 30px 60px rgba(0,0,0,0.5); }
                60% { transform: translateZ(0) translateY(10px) rotateX(-10deg) scale(0.9); opacity: 1; }
                100% { transform: translateZ(0) translateY(0) rotateX(0) scale(1); box-shadow: 0 4px 8px rgba(0,0,0,0.3); }
            }
            
            /* 2. ボタンの赤い波動エフェクト */
            @keyframes pulseDanger {
                0% { box-shadow: 0 0 0 0 rgba(231, 76, 60, 0.8); }
                70% { box-shadow: 0 0 0 20px rgba(231, 76, 60, 0); }
                100% { box-shadow: 0 0 0 0 rgba(231, 76, 60, 0); }
            }
            
            /* 3. 警告テキストの巨大化＆振動 */
            @keyframes shakeAndScale {
                0%, 100% { transform: translateX(0) scale(1); }
                10%, 30%, 50%, 70%, 90% { transform: translateX(-5px) scale(1.05); color: #ff4757; }
                20%, 40%, 60%, 80% { transform: translateX(5px) scale(1.05); color: #ff6b81; }
            }
            
            /* 4. 背景の赤黒い脈打ち */
            @keyframes bgDanger {
                0%, 100% { background-color: #2c3e50; }
                50% { background-color: #4a2323; }
            }
            
            /* アニメーション動作用のクラス */
            .animate-drop { animation: dropIn 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
            .danger-text { animation: shakeAndScale 1.5s infinite; font-size: 28px !important; text-shadow: 0 0 10px rgba(255,71,87,0.5); margin: 15px 0; display: inline-block; }
            .btn-danger-pulse { animation: pulseDanger 1.5s infinite; }
        `;
        document.head.appendChild(style);
    }

    function createCardHTML(card) {
        if (!card) return '';
        let colorClass = card.color ? card.color : 'wild';
        
        let displayValue = card.value !== null ? card.value : '';
        if (card.type === 'skip') displayValue = '⊘';
        if (card.type === 'reverse') displayValue = '⇄';
        if (card.type === 'draw2') displayValue = '+2';
        if (card.type === 'wild') displayValue = 'W';
        if (card.type === 'wild_draw4') displayValue = '+4';

        return `<div class="uno-card ${colorClass}" data-id="${card.id}">${displayValue}</div>`;
    }

    function canPlayCard(playCard, currentCard, currentPenalty = 0) {
        // ペナルティが累積している時は、同じタイプのドローカードしか出せない（スタックルール）
        if (currentPenalty > 0) {
            return playCard.type === currentCard.type;
        }

        if (playCard.type === 'wild' || playCard.type === 'wild_draw4') return true;
        if (playCard.color === currentCard.color) return true;
        if (playCard.type === 'number' && currentCard.type === 'number' && playCard.value === currentCard.value) return true;
        if (playCard.type !== 'number' && playCard.type === currentCard.type) return true;
        return false;
    }

    function getCardName(card) {
        if (!card) return '';
        if (card.type === 'wild') return 'ワイルド';
        if (card.type === 'wild_draw4') return 'ワイルド ドロー4';

        let colorName = '';
        switch(card.color) {
            case 'red': colorName = '赤'; break;
            case 'blue': colorName = '青'; break;
            case 'green': colorName = '緑'; break;
            case 'yellow': colorName = '黄'; break;
        }
        
        let valueName = '';
        if (card.type === 'number') valueName = card.value;
        else if (card.type === 'skip') valueName = 'スキップ';
        else if (card.type === 'reverse') valueName = 'リバース';
        else if (card.type === 'draw2') valueName = 'ドロー2';

        return `${colorName}の${valueName}`;
    }

    function showColorSelector(callback) {
        const overlay = document.createElement('div');
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.backgroundColor = 'rgba(0,0,0,0.8)';
        overlay.style.display = 'flex';
        overlay.style.justifyContent = 'center';
        overlay.style.alignItems = 'center';
        overlay.style.zIndex = '9999';

        const modal = document.createElement('div');
        modal.style.backgroundColor = '#fff';
        modal.style.padding = '30px';
        modal.style.borderRadius = '12px';
        modal.style.textAlign = 'center';
        modal.style.boxShadow = '0 10px 25px rgba(0,0,0,0.5)';
        modal.innerHTML = '<h3 style="color:#333; margin-top:0; margin-bottom: 20px; font-size: 24px;">指定する色を選んでください</h3>';

        const colors = [
            { id: 'red', hex: '#e74c3c', name: '赤' },
            { id: 'blue', hex: '#3498db', name: '青' },
            { id: 'green', hex: '#2ecc71', name: '緑' },
            { id: 'yellow', hex: '#f1c40f', name: '黄' }
        ];

        const btnContainer = document.createElement('div');
        btnContainer.style.display = 'flex';
        btnContainer.style.gap = '15px';
        btnContainer.style.justifyContent = 'center';

        colors.forEach(c => {
            const btn = document.createElement('button');
            btn.innerText = c.name;
            btn.style.backgroundColor = c.hex;
            btn.style.color = 'white';
            btn.style.border = '2px solid rgba(255,255,255,0.5)';
            btn.style.padding = '20px 30px';
            btn.style.fontSize = '20px';
            btn.style.fontWeight = 'bold';
            btn.style.borderRadius = '8px';
            btn.style.cursor = 'pointer';
            btn.style.boxShadow = '0 4px 6px rgba(0,0,0,0.2)';
            
            btn.addEventListener('click', () => {
                document.body.removeChild(overlay);
                callback(c.id);
            });
            btnContainer.appendChild(btn);
        });

        modal.appendChild(btnContainer);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
    }


    // ==========================================
    // 3. レコード詳細画面表示時のメイン処理
    // ==========================================
    kintone.events.on('app.record.detail.show', function(event) {
        const record = event.record;
        
        // ★没入感モード: スペース以外の裏側データ（フィールド）をすべて非表示にする
        const hideFields = [
            'GameID', 'Current_Card', 'Deck_Count', 'Turn_Index', 'Players', 
            'Deck_Data', 'Player0_Hand', 'Player1_Hand', 'Player2_Hand'
        ];
        hideFields.forEach(function(fieldCode) {
            // kintone標準の非表示APIを実行
            kintone.app.record.setFieldShown(fieldCode, false);
        });

        // --- A. まだ初期化されていない場合 ---
        if (!record.Deck_Data || !record.Deck_Data.value) {
            let deck = createDeck();
            deck = shuffleDeck(deck);
            
            const playersHands = { player0: [], player1: [], player2: [] };
            for (let i = 0; i < 7; i++) {
                playersHands.player0.push(deck.pop());
                playersHands.player1.push(deck.pop());
                playersHands.player2.push(deck.pop());
            }

            let initialCard = null;
            while (true) {
                initialCard = deck.pop();
                if (initialCard.type !== 'number') {
                    deck.unshift(initialCard); 
                } else { break; }
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

            kintone.api(kintone.api.url('/k/v1/record.json', true), 'PUT', updateParams).then(function() {
                location.reload();
            });
            return event;
        }

        // --- B. 初期化済みの場合：ゲームUIを描画する ---
        const spaceEl = kintone.app.record.getSpaceElement('game_board_space');
        if (!spaceEl) return event;
        spaceEl.innerHTML = '';

        const loginUser = kintone.getLoginUser();
        const players = record.Players && record.Players.value ? record.Players.value : [];
        let myPlayerIndex = -1;
        let myPlayerName = ''; 
        players.forEach(function(p, index) {
            if (p.code === loginUser.code) {
                myPlayerIndex = index;
                myPlayerName = p.name;
            }
        });

        const currentTurnIndex = record.Turn_Index && record.Turn_Index.value !== undefined ? Number(record.Turn_Index.value) : 0;

        injectStyles();
        const container = document.createElement('div');
        container.id = 'uno-game-container';

        // 場札と、隠し持たせている「進行方向(direction)」「ペナルティ(penalty)」の取得
        const currentCard = JSON.parse(record.Current_Card.value || 'null');
        let currentDirection = currentCard && currentCard.direction !== undefined ? currentCard.direction : 1;
        let currentPenalty = currentCard && currentCard.penalty !== undefined ? currentCard.penalty : 0; 
        
        // ★NEW: ドローのスタックがあり、かつ「自分のターン」の場合は画面全体を危険モードにする
        if (currentPenalty > 0 && currentTurnIndex !== -1 && myPlayerIndex === currentTurnIndex) {
            container.classList.add('danger-mode');
        }

        let myHandStr = '[]';
        if (myPlayerIndex === 0) myHandStr = record.Player0_Hand.value;
        if (myPlayerIndex === 1) myHandStr = record.Player1_Hand.value;
        if (myPlayerIndex === 2) myHandStr = record.Player2_Hand.value;
        const myHand = JSON.parse(myHandStr || '[]');

        const deckCount = record.Deck_Count && record.Deck_Count.value !== undefined ? record.Deck_Count.value : 0;
        
        // ★修正: ゲーム終了状態(-1)の判定と、勝者の特定ロジックを追加
        let turnPlayerName = '';
        let winnerName = '';
        if (currentTurnIndex === -1) {
            turnPlayerName = '🎊 ゲーム終了 🎊';
            // 誰の手札が0枚になったかを判定して勝者を特定する
            if (record.Player0_Hand && JSON.parse(record.Player0_Hand.value || '[]').length === 0) winnerName = players[0] ? players[0].name : 'Player 1';
            else if (record.Player1_Hand && JSON.parse(record.Player1_Hand.value || '[]').length === 0) winnerName = players[1] ? players[1].name : 'Player 2';
            else if (record.Player2_Hand && JSON.parse(record.Player2_Hand.value || '[]').length === 0) winnerName = players[2] ? players[2].name : 'Player 3';
        } else {
            turnPlayerName = players[currentTurnIndex] ? players[currentTurnIndex].name : `Player ${currentTurnIndex}`;
        }
        
        const directionText = currentDirection === 1 ? '🔄 時計回り' : '🔁 反時計回り';

        let playerAreaHTML = '';
        if (myPlayerIndex !== -1) {
            let handHTML = myHand.map(card => createCardHTML(card)).join('');
            
            // ペナルティ中かどうかでボタンの表示を切り替える
            let btnHTML = '';
            if (currentTurnIndex === -1) {
                // ゲーム終了時
                btnHTML = `<div style="color: #f1c40f; font-weight: bold; font-size: 20px;">🏆 このゲームは決着がつきました！お疲れ様でした。</div>`;
            } else if (myPlayerIndex === currentTurnIndex) {
                if (currentPenalty > 0) {
                    // ★NEW: ペナルティを受けるボタンに「btn-danger-pulse（波動）」クラスを追加
                    btnHTML = `
                        <button id="draw-pass-btn" class="btn-danger-pulse" style="padding: 12px 30px; font-size: 16px; background-color: #e74c3c; color: white; border: 2px solid white; border-radius: 8px; font-weight: bold; cursor: pointer;">
                            🚨 ペナルティ ${currentPenalty} 枚引いてターン終了
                        </button>
                    `;
                } else {
                    btnHTML = `
                        <button id="draw-pass-btn" style="padding: 12px 30px; font-size: 16px; background-color: #f39c12; color: white; border: 2px solid white; border-radius: 8px; font-weight: bold; cursor: pointer; box-shadow: 0 4px 6px rgba(0,0,0,0.5);">
                            🔄 山札から1枚引く
                        </button>
                    `;
                }
            } else {
                btnHTML = `<div style="color: #bdc3c7; font-weight: bold;">⏳ 相手のターンを待っています...</div>`;
            }

            playerAreaHTML = `
                <div style="text-align:center; margin-bottom: 10px; font-weight:bold;">あなたの手札 (${myPlayerName})</div>
                <div class="uno-hand">
                    ${handHTML}
                </div>
                <div style="text-align:center; margin-top: 30px;">
                    ${btnHTML}
                </div>
            `;
        } else {
            playerAreaHTML = `<div style="text-align:center; font-weight:bold; color:#f39c12;">あなたは観戦者です（手札はありません）</div>`;
        }

        // ★修正: 勝者が決まっている場合は、大きく優勝者を讃えるHTMLを描画する
        let html = `
            <div style="text-align:center; margin-bottom: 20px;">
                <h2>UNO Game Board</h2>
                ${currentTurnIndex === -1 
                    ? `<h3 style="color:#f1c40f; font-size: 36px; text-shadow: 2px 2px 4px black; margin: 15px 0;">👑 優勝: ${winnerName} 👑</h3><p style="color:#bdc3c7;">ゲーム終了</p>`
                    : `<p>現在のターン: <span style="color:#00ff7f; font-weight:bold;">${turnPlayerName}</span> / 山札残り: ${deckCount}枚 / ${directionText}</p>`
                }
                ${currentPenalty > 0 && currentTurnIndex !== -1 ? `<p class="danger-text" style="color:#e74c3c; font-weight:bold;">⚠️ ドロー累積: ${currentPenalty}枚！出せるカードがなければ引いてください</p>` : ''}
            </div>
            
            <div class="uno-field">
                <div style="text-align:center;">
                    <p style="margin:0 0 10px 0; font-weight:bold;">現在の場札</p>
                    <!-- ★NEW: 場札を animate-drop クラスで囲んで落下アニメーションをつける -->
                    <div class="animate-drop">
                        ${createCardHTML(currentCard)}
                    </div>
                </div>
            </div>
            
            ${playerAreaHTML}
        `;

        container.innerHTML = html;
        spaceEl.appendChild(container);


        // --- C. ゲーム操作ロジック ---
        if (myPlayerIndex !== -1 && currentTurnIndex !== -1) { // ゲーム終了時(-1)は操作不能にする
            
            function saveGameData(updateRecord) {
                const updateParams = {
                    app: kintone.app.getId(),
                    id: kintone.app.record.getId(),
                    record: updateRecord
                };
                kintone.api(kintone.api.url('/k/v1/record.json', true), 'PUT', updateParams).then(function() {
                    location.reload();
                }).catch(function(error) {
                    console.error(error);
                    alert('エラーが発生しました。もう一度お試しください。');
                });
            }

            function setHandToUpdateRecord(updateRecord, playerIndex, handData) {
                if (playerIndex === 0) updateRecord.Player0_Hand = { value: JSON.stringify(handData) };
                if (playerIndex === 1) updateRecord.Player1_Hand = { value: JSON.stringify(handData) };
                if (playerIndex === 2) updateRecord.Player2_Hand = { value: JSON.stringify(handData) };
            }
            
            // スタックルール対応のカード提出ロジック
            function executePlayCard(originalCard, cardToPutOnField) {
                const newHand = myHand.filter(c => c.id !== originalCard.id);
                
                let nextTurnIndex = currentTurnIndex;

                // 勝利判定 (手札が0枚になったか)
                if (newHand.length === 0) {
                    alert(`🎉 おめでとうございます！\n${myPlayerName} が手札をすべて出し切って勝利しました！`);
                    nextTurnIndex = -1; // -1をゲーム終了のフラグとする
                } else {
                    let nextDirection = currentDirection;
                    let skipCount = 1; // 通常は次の人へ

                    // リバースとスキップ
                    if (cardToPutOnField.type === 'reverse') nextDirection = nextDirection * -1;
                    if (cardToPutOnField.type === 'skip') skipCount = 2;

                    // ドロー系のペナルティ蓄積（スタック）
                    if (cardToPutOnField.type === 'draw2') {
                        cardToPutOnField.penalty = currentPenalty + 2;
                    } else if (cardToPutOnField.type === 'wild_draw4') {
                        cardToPutOnField.penalty = currentPenalty + 4;
                    } else {
                        cardToPutOnField.penalty = 0; // その他のカードならペナルティリセット
                    }

                    // 進行方向のデータを場札にこっそり埋め込む
                    cardToPutOnField.direction = nextDirection;

                    // 次のターンを計算（ドロー系を出してもスキップさせず、次の人に「引くか出すか」を迫る）
                    nextTurnIndex = (currentTurnIndex + (nextDirection * skipCount) + 3) % 3;
                }

                const updateRecord = {
                    Current_Card: { value: JSON.stringify(cardToPutOnField) },
                    Turn_Index: { value: nextTurnIndex }
                };

                // 自分の手札を保存
                setHandToUpdateRecord(updateRecord, myPlayerIndex, newHand);
                
                saveGameData(updateRecord);
            }


            const handCards = container.querySelectorAll('.uno-hand .uno-card');
            handCards.forEach(cardEl => {
                cardEl.addEventListener('click', function() {
                    if (myPlayerIndex !== currentTurnIndex) {
                        alert('今はあなたのターンではありません！');
                        return;
                    }

                    const cardId = this.getAttribute('data-id');
                    const selectedCard = myHand.find(c => c.id === cardId);
                    if (!selectedCard) return;

                    // 第3引数にペナルティ枚数を渡して判定
                    if (canPlayCard(selectedCard, currentCard, currentPenalty)) {
                        if (selectedCard.type === 'wild' || selectedCard.type === 'wild_draw4') {
                            showColorSelector(function(selectedColor) {
                                const playedCard = Object.assign({}, selectedCard);
                                playedCard.color = selectedColor; 
                                executePlayCard(selectedCard, playedCard);
                            });
                        } else {
                            if (confirm('このカードを出しますか？')) {
                                executePlayCard(selectedCard, selectedCard);
                            }
                        }
                    } else {
                        alert('このカードは出せません！\n場札と同じ色、または同じ数字・記号を選んでください。');
                    }
                });
            });

            const passBtn = document.getElementById('draw-pass-btn');
            if (passBtn) {
                passBtn.addEventListener('click', function() {
                    if (myPlayerIndex !== currentTurnIndex) {
                        alert('今はあなたのターンではありません！相手のターンを待ってください。');
                        return;
                    }

                    // ペナルティ中の場合
                    if (currentPenalty > 0) {
                        if (confirm(`重ねて出せるカードがありませんか？\nペナルティとして ${currentPenalty} 枚引いてターンを終了します。`)) {
                            let deck = JSON.parse(record.Deck_Data.value || '[]');
                            
                            // 累積された枚数分引く
                            for (let i = 0; i < currentPenalty; i++) {
                                if (deck.length > 0) {
                                    myHand.push(deck.pop());
                                } else {
                                    alert('山札が尽きました！');
                                    break;
                                }
                            }

                            // 次のターンへ
                            const nextTurn = (currentTurnIndex + currentDirection + 3) % 3;
                            
                            // 場札のペナルティだけを 0 にリセットした新しいデータを作る
                            const resetCard = Object.assign({}, currentCard);
                            resetCard.penalty = 0;

                            const updateRecord = {
                                Current_Card: { value: JSON.stringify(resetCard) },
                                Deck_Data: { value: JSON.stringify(deck) },
                                Deck_Count: { value: deck.length },
                                Turn_Index: { value: nextTurn }
                            };
                            
                            setHandToUpdateRecord(updateRecord, myPlayerIndex, myHand);
                            saveGameData(updateRecord);
                        }
                        return; // ペナルティ処理が終わったらここで処理を抜けること
                    }

                    // ==========================================
                    // ここから下はペナルティがない「通常のドロー」処理
                    // ==========================================
                    let deck = JSON.parse(record.Deck_Data.value || '[]');
                    if (deck.length === 0) {
                        alert('山札がありません！');
                        return;
                    }

                    // 山札から引く
                    const drawCard = deck.pop();
                    const nextTurn = (currentTurnIndex + currentDirection + 3) % 3;
                    const cardName = getCardName(drawCard);

                    const updateRecord = {
                        Deck_Data: { value: JSON.stringify(deck) },
                        Deck_Count: { value: deck.length },
                        Turn_Index: { value: nextTurn } // デフォルトは次の人に回す
                    };

                    // 引いたカードが出せるか判定
                    if (canPlayCard(drawCard, currentCard, 0)) {
                        if (confirm(`引いたカードは「${cardName}」でした！\nこのカードはすぐに出すことができます。出しますか？\n（キャンセルを選ぶと手札に加えてパスします）`)) {
                            
                            // 引いてすぐ出す場合の特殊効果（方向とペナルティ）を計算
                            let nextDirection = currentDirection;
                            let skipCount = 1;

                            if (drawCard.type === 'reverse') nextDirection = nextDirection * -1;
                            if (drawCard.type === 'skip') skipCount = 2;

                            let nextPenalty = 0;
                            if (drawCard.type === 'draw2') {
                                nextPenalty = currentPenalty + 2;
                            } else if (drawCard.type === 'wild_draw4') {
                                nextPenalty = currentPenalty + 4;
                            }

                            const actualNextTurn = (currentTurnIndex + (nextDirection * skipCount) + 3) % 3;
                            
                            // 勝利判定 (山札から引いてそのまま上がった場合)
                            if (myHand.length === 0) {
                                alert(`🎉 おめでとうございます！\n${myPlayerName} が引いたカードを出して手札をすべて出し切り、勝利しました！`);
                                updateRecord.Turn_Index = { value: -1 };
                            } else {
                                updateRecord.Turn_Index = { value: actualNextTurn };
                            }

                            if (drawCard.type === 'wild' || drawCard.type === 'wild_draw4') {
                                showColorSelector(function(selectedColor) {
                                    const playedCard = Object.assign({}, drawCard);
                                    playedCard.color = selectedColor; 
                                    
                                    // 進行方向とペナルティをセット
                                    playedCard.direction = nextDirection;
                                    playedCard.penalty = nextPenalty;

                                    updateRecord.Current_Card = { value: JSON.stringify(playedCard) };
                                    setHandToUpdateRecord(updateRecord, myPlayerIndex, myHand); // ※手札は増やさない
                                    saveGameData(updateRecord);
                                });
                                return; 
                            } else {
                                // 通常カードやその他の特殊カード
                                drawCard.direction = nextDirection;
                                drawCard.penalty = nextPenalty;

                                updateRecord.Current_Card = { value: JSON.stringify(drawCard) };
                                setHandToUpdateRecord(updateRecord, myPlayerIndex, myHand); // ※手札は増やさない
                                saveGameData(updateRecord);
                                return;
                            }
                        }
                    } else {
                        alert(`引いたカードは「${cardName}」でした。\n場に出せないため、手札に加えてターンを終了します。`);
                    }

                    // 出さなかった場合・出せなかった場合は手札に加えてパス
                    myHand.push(drawCard);
                    setHandToUpdateRecord(updateRecord, myPlayerIndex, myHand);
                    saveGameData(updateRecord);
                    
                });
            }
        }

        // --- D. 盤面の自動更新（ポーリング）ロジック ---
        const currentRevision = record['$revision'].value;
        
        if (window.unoPollingTimer) {
            clearInterval(window.unoPollingTimer);
        }

        window.unoPollingTimer = setInterval(function() {
            kintone.api(kintone.api.url('/k/v1/record.json', true), 'GET', {
                app: kintone.app.getId(),
                id: kintone.app.record.getId()
            }).then(function(resp) {
                const fetchedRevision = resp.record['$revision'].value;
                if (Number(fetchedRevision) > Number(currentRevision)) {
                    console.log("他プレイヤーの操作を検知しました！画面を更新します。");
                    location.reload();
                }
            }).catch(function(err) {
                // エラー時は無視
            });
        }, 3000);

        return event;
    });

})();