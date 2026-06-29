/**
 * UNO Game Lobby - 参加/退出 & ゲーム開始制御ロジック (何人でも対応版)
 * 盤面(Board)アプリと連携し、不整合を防ぎながら動的にゲームを開始します。
 */

(function() {
    'use strict';

    const BOARD_APP_ID = 12023; // ★盤面(Board)アプリのアプリID

    kintone.events.on('app.record.detail.show', function(event) {
        const record = event.record;
        
        const status = record.Status && record.Status.value ? record.Status.value : 'Waiting';
        const players = record.Players && record.Players.value ? record.Players.value : [];
        const gameId = record.GameID && record.GameID.value ? record.GameID.value : '';
        const loginUser = kintone.getLoginUser();

        // 既にプレイ中、または終了している場合はボタンを表示しない
        if (status !== 'Waiting' && status !== '') {
            return event;
        }

        // メニュースペースの取得と重複生成防止
        const spaceElement = kintone.app.record.getHeaderMenuSpaceElement();
        if (!spaceElement || document.getElementById('uno-lobby-actions') !== null) {
            return event;
        }

        // アクションボタンを配置するコンテナ
        const btnContainer = document.createElement('div');
        btnContainer.id = 'uno-lobby-actions';
        btnContainer.style.display = 'inline-block';
        btnContainer.style.margin = '10px';
        spaceElement.appendChild(btnContainer);

        // 自分がすでに参加済みかチェック
        const isAlreadyJoined = players.some(p => p.code === loginUser.code);

        // 1. 【参加する】ボタンの表示条件
        if (!isAlreadyJoined) {
            const joinButton = document.createElement('button');
            joinButton.innerText = '🎮 このゲームに参加する';
            joinButton.style.padding = '10px 20px';
            joinButton.style.backgroundColor = '#3498db';
            joinButton.style.color = '#fff';
            joinButton.style.border = 'none';
            joinButton.style.borderRadius = '5px';
            joinButton.style.fontWeight = 'bold';
            joinButton.style.cursor = 'pointer';
            joinButton.style.marginRight = '10px';

            joinButton.addEventListener('click', function() {
                if (!gameId) {
                    alert('GameIDが設定されていません。レコードを編集してGameIDを入力してください。');
                    return;
                }
                joinButton.innerText = '参加処理中...';
                joinButton.disabled = true;

                const newPlayers = players.map(p => ({ code: p.code }));
                newPlayers.push({ code: loginUser.code });

                const updateParams = {
                    app: kintone.app.getId(),
                    id: kintone.app.record.getId(),
                    record: {
                        Players: { value: newPlayers }
                    }
                };

                kintone.api(kintone.api.url('/k/v1/record.json', true), 'PUT', updateParams).then(function() {
                    alert('ゲームに参加しました！現在の参加人数: ' + newPlayers.length + ' 人');
                    location.reload();
                }).catch(function(err) {
                    console.error(err);
                    alert('参加処理に失敗しました。');
                    joinButton.innerText = '🎮 このゲームに参加する';
                    joinButton.disabled = false;
                });
            });

            btnContainer.appendChild(joinButton);
        }

        // 2. 【退出する】ボタンの表示条件 (参加している時のみ)
        if (isAlreadyJoined) {
            const leaveButton = document.createElement('button');
            leaveButton.innerText = '🚪 退出する';
            leaveButton.style.padding = '10px 20px';
            leaveButton.style.backgroundColor = '#e74c3c';
            leaveButton.style.color = '#fff';
            leaveButton.style.border = 'none';
            leaveButton.style.borderRadius = '5px';
            leaveButton.style.fontWeight = 'bold';
            leaveButton.style.cursor = 'pointer';
            leaveButton.style.marginRight = '10px';

            leaveButton.addEventListener('click', function() {
                if (confirm('ロビーから退出しますか？')) {
                    leaveButton.innerText = '退出処理中...';
                    leaveButton.disabled = true;

                    const newPlayers = players.filter(p => p.code !== loginUser.code).map(p => ({ code: p.code }));

                    const updateParams = {
                        app: kintone.app.getId(),
                        id: kintone.app.record.getId(),
                        record: {
                            Players: { value: newPlayers }
                        }
                    };

                    kintone.api(kintone.api.url('/k/v1/record.json', true), 'PUT', updateParams).then(function() {
                        alert('ロビーから退出しました。');
                        location.reload();
                    }).catch(function(err) {
                        console.error(err);
                        alert('退出処理に失敗しました。');
                        leaveButton.innerText = '🚪 退出する';
                        leaveButton.disabled = false;
                    });
                }
            });

            btnContainer.appendChild(leaveButton);
        }

        // 3. 【ゲームを開始する】ボタン (2人以上、かつ自分が参加しているときに表示)
        // 部屋の作成者、あるいは最初に入った人(Players[0])をホストとみなして押せるようにする
        const isHost = players.length > 0 && players[0].code === loginUser.code;
        if (isAlreadyJoined && players.length >= 2 && isHost) {
            const startButton = document.createElement('button');
            startButton.innerText = '🚀 ゲームを開始する (参加者: ' + players.length + '人)';
            startButton.style.padding = '10px 20px';
            startButton.style.backgroundColor = '#2ecc71';
            startButton.style.color = '#fff';
            startButton.style.border = 'none';
            startButton.style.borderRadius = '5px';
            startButton.style.fontWeight = 'bold';
            startButton.style.cursor = 'pointer';

            startButton.addEventListener('click', function() {
                startButton.innerText = 'ゲーム起動中...';
                startButton.disabled = true;

                const currentPlayersFormatted = players.map(p => ({ code: p.code }));

                // ① 盤面(Board)アプリ側に直接「最新のプレイヤーリスト」を送ってレコードを作成する！
                // これにより、ルックアップの自動同期タイムラグによる「4人目が同期漏れで手札0枚になる不具合」を100%防止します。
                const boardPostParams = {
                    app: BOARD_APP_ID,
                    record: {
                        GameID: { value: gameId },
                        Turn_Index: { value: 0 },
                        Players: { value: currentPlayersFormatted } // 参加者リストをダイレクト転送
                    }
                };

                kintone.api(kintone.api.url('/k/v1/record.json', true), 'POST', boardPostParams).then(function(boardResp) {
                    const boardRecordId = boardResp.id;

                    // ② ロビーを「Playing（プレイ中）」にし、BoardのレコードIDを紐付ける
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
                    alert('🎉 ゲームを開始します！盤面を開きます。');
                    location.reload();
                }).catch(function(error) {
                    console.error(error);
                    alert('ゲーム開始処理に失敗しました。詳細: ' + error.message);
                    startButton.innerText = '🚀 ゲームを開始する';
                    startButton.disabled = false;
                });
            });

            btnContainer.appendChild(startButton);
        }

        return event;
    });
})();