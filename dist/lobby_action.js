(function() {
	//#region src/lobby_main.js
	/**
	* UNO Game Lobby - 参加ボタン実装ロジック
	* レコード詳細画面に「参加する」ボタンを設置し、自分をプレイヤーに追加する
	*/
	(function() {
		"use strict";
		const BOARD_APP_ID = 12023;
		kintone.events.on("app.record.detail.show", function(event) {
			const record = event.record;
			const status = record.Status && record.Status.value ? record.Status.value : "Waiting";
			const players = record.Players && record.Players.value ? record.Players.value : [];
			const gameId = record.GameID && record.GameID.value ? record.GameID.value : "";
			const loginUser = kintone.getLoginUser();
			if (players.length >= 3 || status !== "Waiting" && status !== "") return event;
			if (players.some(function(player) {
				return player.code === loginUser.code;
			})) return event;
			const spaceElement = kintone.app.record.getHeaderMenuSpaceElement();
			if (document.getElementById("join-game-btn") !== null) return;
			const joinButton = document.createElement("button");
			joinButton.id = "join-game-btn";
			joinButton.innerHTML = "🎮 このゲームに参加する";
			joinButton.style.padding = "10px 20px";
			joinButton.style.backgroundColor = "#3498db";
			joinButton.style.color = "#fff";
			joinButton.style.border = "none";
			joinButton.style.borderRadius = "5px";
			joinButton.style.fontWeight = "bold";
			joinButton.style.cursor = "pointer";
			joinButton.style.margin = "10px";
			spaceElement.appendChild(joinButton);
			joinButton.addEventListener("click", function() {
				if (!gameId) {
					alert("GameIDが設定されていません。レコードを編集してGameIDを入力してください。");
					return;
				}
				joinButton.innerText = "参加処理中...";
				joinButton.disabled = true;
				const newPlayers = players.map(function(p) {
					return { code: p.code };
				});
				newPlayers.push({ code: loginUser.code });
				if (newPlayers.length === 3) {
					console.log("送信するGameID: ", gameId);
					const lobbyUpdatePlayersParams = {
						app: kintone.app.getId(),
						id: kintone.app.record.getId(),
						record: { Players: { value: newPlayers } }
					};
					kintone.api(kintone.api.url("/k/v1/record.json", true), "PUT", lobbyUpdatePlayersParams).then(function() {
						const boardPostParams = {
							app: BOARD_APP_ID,
							record: {
								GameID: { value: gameId },
								Turn_Index: { value: 0 }
							}
						};
						return kintone.api(kintone.api.url("/k/v1/record.json", true), "POST", boardPostParams);
					}).then(function(boardResp) {
						const boardRecordId = boardResp.id;
						const lobbyUpdateStatusParams = {
							app: kintone.app.getId(),
							id: kintone.app.record.getId(),
							record: {
								Status: { value: "Playing" },
								Board_Record_ID: { value: boardRecordId }
							}
						};
						return kintone.api(kintone.api.url("/k/v1/record.json", true), "PUT", lobbyUpdateStatusParams);
					}).then(function() {
						alert("3人揃いました！ゲーム盤面を作成し、開始します！");
						location.reload();
					}).catch(function(error) {
						console.error(error);
						alert("ゲーム開始処理に失敗しました。詳細: " + error.message);
						joinButton.innerText = "🎮 このゲームに参加する";
						joinButton.disabled = false;
					});
				} else {
					const updateParams = {
						app: kintone.app.getId(),
						id: kintone.app.record.getId(),
						record: { Players: { value: newPlayers } }
					};
					kintone.api(kintone.api.url("/k/v1/record.json", true), "PUT", updateParams, function(resp) {
						alert("ゲームに参加しました！あと " + (3 - newPlayers.length) + " 人待っています...");
						location.reload();
					}, function(error) {
						console.error(error);
						alert("参加処理に失敗しました。コンソールを確認してください。");
						joinButton.innerText = "🎮 このゲームに参加する";
						joinButton.disabled = false;
					});
				}
			});
			return event;
		});
	})();
	//#endregion
})();
