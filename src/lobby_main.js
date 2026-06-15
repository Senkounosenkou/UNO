/**
 * UNO Game Lobby - 参加ボタン実装ロジック
 * レコード詳細画面に「参加する」ボタンを設置し、自分をプレイヤーに追加する
 */

(function() {
    'use strict';

    const BOARD_APP_ID = 12023; // ★盤面(Board)アプリのアプリID

    // レコード詳細画面が表示されたときに実行
    kintone.events.on('app.record.detail.show', function(event) {
        const record = event.record;
        
        // フィールドコードが設定と合っているか確認してください
        const status = record.Status && record.Status.value ? record.Status.value : 'Waiting'; // 初期値未設定でもWaitingとして扱う
        const players = record.Players && record.Players.value ? record.Players.value : [];
        const gameId = record.GameID && record.GameID.value ? record.GameID.value : ''; // ★追加: 現在のGameIDを取得
        const loginUser = kintone.getLoginUser();

        // 1. すでに3人揃っている、またはプレイ中以降ならボタンを出さない
        if (players.length >= 3 || (status !== 'Waiting' && status !== '')) {
            return event;
        }

        // 2. 自分がすでに参加済みかチェック
        const isAlreadyJoined = players.some(function(player) {
            return player.code === loginUser.code;
        });

        if (isAlreadyJoined) {
            // すでに参加している場合は何もしない（ボタンを出さない）
            return event; 
        }

        // 3. メニュースペースに「参加する」ボタンを生成
        const spaceElement = kintone.app.record.getHeaderMenuSpaceElement();
        if (document.getElementById('join-game-btn') !== null) {
            return; // 重複生成の防止
        }

        const joinButton = document.createElement('button');
        joinButton.id = 'join-game-btn';
        joinButton.innerHTML = '🎮 このゲームに参加する';
        joinButton.style.padding = '10px 20px';
        joinButton.style.backgroundColor = '#3498db';
        joinButton.style.color = '#fff';
        joinButton.style.border = 'none';
        joinButton.style.borderRadius = '5px';
        joinButton.style.fontWeight = 'bold';
        joinButton.style.cursor = 'pointer';
        joinButton.style.margin = '10px';

        spaceElement.appendChild(joinButton);

        // 4. ボタンクリック時の処理（REST APIでレコード更新）
        joinButton.addEventListener('click', function() {
            if (!gameId) {
                alert('GameIDが設定されていません。レコードを編集してGameIDを入力してください。');
                return;
            }

            joinButton.innerText = '参加処理中...';
            joinButton.disabled = true;

            // 新しいプレイヤーリストを作成（既存の参加者 + 自分）
            const newPlayers = players.map(function(p) {
                return { code: p.code }; 
            });
            newPlayers.push({ code: loginUser.code });

            // ★ 3人揃った場合の処理分岐を追加
            if (newPlayers.length === 3) {
                // --- 3人目の場合：Boardアプリにレコード作成 → Lobby更新 ---
                
                // ★追加: デバッグ用に送信データをコンソールに出力
                console.log("送信するGameID: ", gameId);
                
                // ① Lobbyに3人目のプレイヤーを先に保存する (ルックアップで3人とも引っ張るため)
                const lobbyUpdatePlayersParams = {
                    app: kintone.app.getId(),
                    id: kintone.app.record.getId(),
                    record: {
                        Players: { value: newPlayers }
                    }
                };

                kintone.api(kintone.api.url('/k/v1/record.json', true), 'PUT', lobbyUpdatePlayersParams).then(function() {
                    // ② BoardにPOST（新規作成）
                    // ※Lobbyに3人保存された後なので、ルックアップで3人分コピーされます
                    const boardPostParams = {
                        app: BOARD_APP_ID,
                        record: {
                            GameID: { value: gameId },
                            Turn_Index: { value: 0 }
                        }
                    };
                    return kintone.api(kintone.api.url('/k/v1/record.json', true), 'POST', boardPostParams);
                }).then(function(boardResp) {
                    const boardRecordId = boardResp.id;
                    
                    // ③ Lobbyを「プレイ中」に更新し、作成したBoardレコード番号を記録
                    const lobbyUpdateStatusParams = {
                        app: kintone.app.getId(),
                        id: kintone.app.record.getId(),
                        record: {
                            Status: { value: 'Playing' },
                            Board_Record_ID: { value: boardRecordId }
                        }
                    };
                    return kintone.api(kintone.api.url('/k/v1/record.json', true), 'PUT', lobbyUpdateStatusParams);
                }).then(function() {
                    alert('3人揃いました！ゲーム盤面を作成し、開始します！');
                    location.reload();
                }).catch(function(error) {
                    console.error(error);
                    alert('ゲーム開始処理に失敗しました。詳細: ' + error.message);
                    joinButton.innerText = '🎮 このゲームに参加する';
                    joinButton.disabled = false;
                });

            } else {
                // --- 1〜2人目の場合：Lobbyに自分を追加するだけ ---
                const updateParams = {
                    app: kintone.app.getId(),
                    id: kintone.app.record.getId(),
                    record: {
                        Players: {
                            value: newPlayers
                        }
                    }
                };

                // APIを叩いて自分を追加
                kintone.api(kintone.api.url('/k/v1/record.json', true), 'PUT', updateParams, function(resp) {
                    // 成功したら画面をリロードして最新状態を反映
                    alert('ゲームに参加しました！あと ' + (3 - newPlayers.length) + ' 人待っています...');
                    location.reload();
                }, function(error) {
                    console.error(error);
                    alert('参加処理に失敗しました。コンソールを確認してください。');
                    joinButton.innerText = '🎮 このゲームに参加する';
                    joinButton.disabled = false;
                });
            }
        });

        return event;
    });

})();
