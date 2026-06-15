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

    function canPlayCard(playCard, currentCard, currentPenalty = 0) {
        // ★NEW: ペナルティが累積している時は、同じタイプのドローカードしか出せない（スタック）
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

        injectStyles();
        const container = document.createElement('div');
        container.id = 'uno-game-container';
        
        // 場札と、隠し持たせている「進行方向(direction)」「ペナルティ(penalty)」の取得
        const currentCard = JSON.parse(record.Current_Card.value || 'null');
        let currentDirection = currentCard && currentCard.direction !== undefined ? currentCard.direction : 1;
        let currentPenalty = currentCard && currentCard.penalty !== undefined ? currentCard.penalty : 0; // ★NEW

        let myHandStr = '[]';
        if (myPlayerIndex === 0) myHandStr = record.Player0_Hand.value;
        if (myPlayerIndex === 1) myHandStr = record.Player1_Hand.value;
        if (myPlayerIndex === 2) myHandStr = record.Player2_Hand.value;
        const myHand = JSON.parse(myHandStr || '[]');

        const currentTurnIndex = record.Turn_Index && record.Turn_Index.value !== undefined ? Number(record.Turn_Index.value) : 0;
        const deckCount = record.Deck_Count && record.Deck_Count.value !== undefined ? record.Deck_Count.value : 0;
        const turnPlayerName = players[currentTurnIndex] ? players[currentTurnIndex].name : `Player ${currentTurnIndex}`;
        const directionText = currentDirection === 1 ? '🔄 時計回り' : '🔁 反時計回り';

        let playerAreaHTML = '';
        if (myPlayerIndex !== -1) {
            let handHTML = myHand.map(card => createCardHTML(card)).join('');
            
            // ★NEW: ペナルティ中かどうかでボタンの表示を切り替える
            let btnHTML = '';
            if (myPlayerIndex === currentTurnIndex) {
                if (currentPenalty > 0) {
                    btnHTML = `
                        <button id="draw-pass-btn" style="padding: 12px 30px; font-size: 16px; background-color: #e74c3c; color: white; border: 2px solid white; border-radius: 8px; font-weight: bold; cursor: pointer; box-shadow: 0 4px 6px rgba(0,0,0,0.5);">
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

        let html = `
            <div style="text-align:center; margin-bottom: 20px;">
                <h2>UNO Game Board</h2>
                <p>現在のターン: <span style="color:#00ff7f; font-weight:bold;">${turnPlayerName}</span> / 山札残り: ${deckCount}枚 / ${directionText}</p>
                ${currentPenalty > 0 ? `<p style="color:#e74c3c; font-weight:bold; font-size:24px;">⚠️ ドロー累積: ${currentPenalty}枚！出せるカードがなければ引いてください</p>` : ''}
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


        // --- C. ゲーム操作ロジック ---
        if (myPlayerIndex !== -1) {
            
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
            
            // ★ スタックルール対応のカード提出ロジック
            function executePlayCard(originalCard, cardToPutOnField) {
                const newHand = myHand.filter(c => c.id !== originalCard.id);
                
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
                const nextTurnIndex = (currentTurnIndex + (nextDirection * skipCount) + 3) % 3;

                const updateRecord = {
                    Current_Card: { value: JSON.stringify(cardToPutOnField) },
                    Turn_Index: { value: nextTurnIndex }
                };

                // 自分の手札を保存
                setHandToUpdateRecord(updateRecord, myPlayerIndex, newHand);
                
                saveGameData(updateRecord);
            }


            // 手札クリックのイベントリスナー
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

                    // ★第3引数にペナルティ枚数を渡して判定
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

            // 山札から引くボタン (ペナルティ受け入れボタン兼任)
            const passBtn = document.getElementById('draw-pass-btn');
            if (passBtn) {
                passBtn.addEventListener('click', function() {
                    if (myPlayerIndex !== currentTurnIndex) {
                        alert('今はあなたのターンではありません！相手のターンを待ってください。');
                        return;
                    }

                    // ★ NEW: ペナルティ中の場合
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
                        return; // ペナルティ処理時はここで抜ける
                    }

                    // ★ 通常時（1枚引く場合）
                    if (confirm('山札からカードを1枚引きますか？')) {
                        const deck = JSON.parse(record.Deck_Data.value || '[]');
                        if (deck.length === 0) {
                            alert('山札がありません！');
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
                                
                                if (drawCard.type === 'wild' || drawCard.type === 'wild_draw4') {
                                    showColorSelector(function(selectedColor) {
                                        const playedCard = Object.assign({}, drawCard);
                                        playedCard.color = selectedColor; 
                                        
                                        // 引いてすぐ出す場合も特殊カードの効果を発動させるために関数を呼び出す
                                        // ただし、今回は「手札から引く」処理をスキップさせるため、手札配列ではなく引いたカードの配列を渡すトリックを使う
                                        // ※今回は簡略化のため、引いてすぐ出す場合は特殊効果判定(executePlayCard)を使わずにそのまま出す
                                        playedCard.direction = currentDirection;
                                        updateRecord.Current_Card = { value: JSON.stringify(playedCard) };
                                        setHandToUpdateRecord(updateRecord, myPlayerIndex, myHand); 
                                        saveGameData(updateRecord);
                                    });
                                    return; 
                                } else {
                                    drawCard.direction = currentDirection;
                                    updateRecord.Current_Card = { value: JSON.stringify(drawCard) };
                                    setHandToUpdateRecord(updateRecord, myPlayerIndex, myHand); 
                                    saveGameData(updateRecord);
                                    return;
                                }
                            }
                        } else {
                            alert(`引いたカードは「${cardName}」でした。\n場に出せないため、手札に加えてターンを終了します。`);
                        }

                        myHand.push(drawCard);
                        setHandToUpdateRecord(updateRecord, myPlayerIndex, myHand);
                        saveGameData(updateRecord);
                    }
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
            });
        }, 3000);

        return event;
    });

})();