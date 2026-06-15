/**
 * UNO Game Board - メインロジック
 * 初期化（カード配布）および、ゲーム画面(UI)の描画を行う
 */

(function() {
    'use strict';

    // ==========================================
    // 1. UNOカード生成・シャッフルロジック (変更なし)
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
            #uno-game-container { font-family: sans-serif; background: #2c3e50; padding: 20px; border-radius: 10px; color: white; }
            .uno-field { display: flex; justify-content: center; margin-bottom: 40px; padding: 20px; background: rgba(0,0,0,0.2); border-radius: 10px; }
            .uno-hand { display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; }
            .uno-card {
                width: 80px; height: 120px; border-radius: 8px; border: 4px solid white;
                box-shadow: 0 4px 8px rgba(0,0,0,0.3); display: flex; justify-content: center; align-items: center;
                font-size: 32px; font-weight: bold; color: white; text-shadow: 1px 1px 2px black;
                cursor: pointer; transition: transform 0.2s; user-select: none;
            }
            .uno-card:hover { transform: translateY(-10px); }
            .uno-card.red { background-color: #e74c3c; }
            .uno-card.blue { background-color: #3498db; }
            .uno-card.green { background-color: #2ecc71; }
            .uno-card.yellow { background-color: #f1c40f; }
            .uno-card.wild { background-color: #2c3e50; background-image: conic-gradient(#e74c3c 90deg, #3498db 90deg 180deg, #2ecc71 180deg 270deg, #f1c40f 270deg); }
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

    function canPlayCard(playCard, currentCard) {
        // 1. ワイルド系はいつでも出せる
        if (playCard.type === 'wild' || playCard.type === 'wild_draw4') return true;
        // 2. 色が同じなら出せる
        if (playCard.color === currentCard.color) return true;
        // 3. 数字が同じなら出せる
        if (playCard.type === 'number' && currentCard.type === 'number' && playCard.value === currentCard.value) return true;
        // 4. 記号が同じなら出せる (SkipにSkipなど)
        if (playCard.type !== 'number' && playCard.type === currentCard.type) return true;
        
        return false;
    }


    // ==========================================
    // 3. レコード詳細画面表示時のメイン処理
    // ==========================================
    kintone.events.on('app.record.detail.show', function(event) {
        const record = event.record;
        
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
        if (document.getElementById('uno-game-container')) return event;

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

        injectStyles();
        const container = document.createElement('div');
        container.id = 'uno-game-container';
        
        const currentCard = JSON.parse(record.Current_Card.value || 'null');

        let myHandStr = '[]';
        if (myPlayerIndex === 0) myHandStr = record.Player0_Hand.value;
        if (myPlayerIndex === 1) myHandStr = record.Player1_Hand.value;
        if (myPlayerIndex === 2) myHandStr = record.Player2_Hand.value;
        const myHand = JSON.parse(myHandStr || '[]');

        const currentTurnIndex = record.Turn_Index && record.Turn_Index.value !== undefined ? Number(record.Turn_Index.value) : 0;
        const deckCount = record.Deck_Count && record.Deck_Count.value !== undefined ? record.Deck_Count.value : 0;
        const turnPlayerName = players[currentTurnIndex] ? players[currentTurnIndex].name : `Player ${currentTurnIndex}`;

        // ★修正: html += を使わず、事前にプレイヤーエリアのHTMLを組み立てておく
        let playerAreaHTML = '';
        if (myPlayerIndex !== -1) {
            let handHTML = myHand.map(card => createCardHTML(card)).join('');
            playerAreaHTML = `
                <div style="text-align:center; margin-bottom: 10px; font-weight:bold;">あなたの手札 (${myPlayerName})</div>
                <div class="uno-hand">
                    ${handHTML}
                </div>
                <div style="text-align:center; margin-top: 20px;">
                    <button id="draw-pass-btn" style="padding: 10px 20px; font-size: 16px; background-color: #f39c12; color: white; border: none; border-radius: 5px; font-weight: bold; cursor: pointer; box-shadow: 0 4px 6px rgba(0,0,0,0.3);">
                        山札から引いてパス
                    </button>
                </div>
            `;
        } else {
            playerAreaHTML = `<div style="text-align:center; font-weight:bold; color:#f39c12;">あなたは観戦者です（手札はありません）</div>`;
        }

        let html = `
            <div style="text-align:center; margin-bottom: 20px;">
                <h2>UNO Game Board</h2>
                <p>現在のターン: <span style="color:#00ff7f; font-weight:bold;">${turnPlayerName}</span> / 山札残り: ${deckCount}枚</p>
            </div>
            
            <div class="uno-field">
                <div style="text-align:center;">
                    <p style="margin:0 0 10px 0; font-weight:bold;">現在の場札</p>
                    ${createCardHTML(currentCard)}
                </div>
            </div>
            
            ${playerAreaHTML}
        `;

        container.innerHTML = html;
        spaceEl.appendChild(container);


        // --- C. ゲーム操作ロジック（カードクリック & パス） ---
        if (myPlayerIndex !== -1) {
            const handCards = container.querySelectorAll('.uno-hand .uno-card');
            
            handCards.forEach(cardEl => {
                cardEl.addEventListener('click', function() {
                    // 1. 自分のターンかチェック
                    if (myPlayerIndex !== currentTurnIndex) {
                        alert('今はあなたのターンではありません！');
                        return;
                    }

                    const cardId = this.getAttribute('data-id');
                    const selectedCard = myHand.find(c => c.id === cardId);
                    if (!selectedCard) return;

                    // 2. 出せるかルール判定
                    if (canPlayCard(selectedCard, currentCard)) {
                        if (confirm('このカードを出しますか？')) {
                            
                            // 手札から選んだカードを削除
                            const newHand = myHand.filter(c => c.id !== selectedCard.id);
                            
                            // 次のターンを計算（シンプルに時計回りに 0 -> 1 -> 2 -> 0）
                            const nextTurn = (currentTurnIndex + 1) % 3;

                            // APIで更新するデータをまとめる
                            const updateRecord = {
                                Current_Card: { value: JSON.stringify(selectedCard) },
                                Turn_Index: { value: nextTurn }
                            };

                            // 自分の手札フィールドを更新対象にセット
                            if (myPlayerIndex === 0) updateRecord.Player0_Hand = { value: JSON.stringify(newHand) };
                            if (myPlayerIndex === 1) updateRecord.Player1_Hand = { value: JSON.stringify(newHand) };
                            if (myPlayerIndex === 2) updateRecord.Player2_Hand = { value: JSON.stringify(newHand) };

                            const updateParams = {
                                app: kintone.app.getId(),
                                id: kintone.app.record.getId(),
                                record: updateRecord
                            };

                            // 3. データを保存して画面をリロード
                            kintone.api(kintone.api.url('/k/v1/record.json', true), 'PUT', updateParams).then(function() {
                                location.reload();
                            }).catch(function(error) {
                                console.error(error);
                                alert('エラーが発生しました。もう一度お試しください。');
                            });
                        }
                    } else {
                        // 出せないカードをクリックした場合
                        alert('このカードは出せません！\n場札と同じ色、または同じ数字・記号を選んでください。');
                    }
                });
            });

            // パスボタンのロジック（ボタンが存在する場合のみイベントを付与）
            const passBtn = document.getElementById('draw-pass-btn');
            if (passBtn) {
                passBtn.addEventListener('click', function() {
                    // ★追加: クリックされた瞬間に、自分のターンかどうかを判定する
                    if (myPlayerIndex !== currentTurnIndex) {
                        alert('今はあなたのターンではありません！相手のターンを待ってください。');
                        return;
                    }

                    if (confirm('出せるカードがありませんか？\n山札から1枚引いて、次のプレイヤーにターンを回します。')) {
                        
                        // 山札データを取得
                        const deck = JSON.parse(record.Deck_Data.value || '[]');
                        
                        if (deck.length === 0) {
                            alert('山札がありません！');
                            return; 
                        }

                        // 山札から1枚引く
                        const drawCard = deck.pop();
                        
                        // 自分の手札に追加
                        myHand.push(drawCard);

                        // 次のターンを計算
                        const nextTurn = (currentTurnIndex + 1) % 3;

                        // APIで更新するデータをまとめる
                        const updateRecord = {
                            Deck_Data: { value: JSON.stringify(deck) },
                            Deck_Count: { value: deck.length },
                            Turn_Index: { value: nextTurn }
                        };

                        // 自分の手札フィールドを更新対象にセット
                        if (myPlayerIndex === 0) updateRecord.Player0_Hand = { value: JSON.stringify(myHand) };
                        if (myPlayerIndex === 1) updateRecord.Player1_Hand = { value: JSON.stringify(myHand) };
                        if (myPlayerIndex === 2) updateRecord.Player2_Hand = { value: JSON.stringify(myHand) };

                        const updateParams = {
                            app: kintone.app.getId(),
                            id: kintone.app.record.getId(),
                            record: updateRecord
                        };

                        // データを保存して画面をリロード
                        kintone.api(kintone.api.url('/k/v1/record.json', true), 'PUT', updateParams).then(function() {
                            location.reload();
                        }).catch(function(error) {
                            console.error(error);
                            alert('エラーが発生しました。もう一度お試しください。');
                        });
                    }
                });
            }
        }

        // --- D. 盤面の自動更新（ポーリング）ロジック ---
        // 現在のレコードの更新バージョン（リビジョン）を保持
        const currentRevision = record['$revision'].value;
        
        // すでにタイマーが動いていればクリア（重複防止）
        if (window.unoPollingTimer) {
            clearInterval(window.unoPollingTimer);
        }

        // 3秒（3000ミリ秒）ごとに最新のレコード情報を裏側で取得
        window.unoPollingTimer = setInterval(function() {
            kintone.api(kintone.api.url('/k/v1/record.json', true), 'GET', {
                app: kintone.app.getId(),
                id: kintone.app.record.getId()
            }).then(function(resp) {
                const fetchedRevision = resp.record['$revision'].value;
                // 取得したリビジョンが、画面を開いた時のリビジョンより大きければ、誰かが更新したと判定
                if (Number(fetchedRevision) > Number(currentRevision)) {
                    console.log("他プレイヤーの操作を検知しました！画面を更新します。");
                    location.reload();
                }
            }).catch(function(err) {
                // エラー時は無視（一時的な通信エラーなどを想定）
            });
        }, 3000);

        return event;
    });

})();