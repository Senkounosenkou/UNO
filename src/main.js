import { createDeck, shuffleDeck, canPlayCard, getCardName } from './model.js';
import { renderGameBoard, showColorSelector } from './view.js';

(function() {
    'use strict';

    kintone.events.on('app.record.detail.show', function(event) {
        const record = event.record;
        
        // 没入感モード: スペース以外の裏側データ（フィールド）をすべて非表示にする
        const hideFields = [
            'GameID', 'Current_Card', 'Deck_Count', 'Turn_Index', 'Players', 
            'Deck_Data', 'Player0_Hand', 'Player1_Hand', 'Player2_Hand'
        ];
        hideFields.forEach(function(fieldCode) {
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

        const currentCard = JSON.parse(record.Current_Card.value || 'null');
        let currentDirection = currentCard && currentCard.direction !== undefined ? currentCard.direction : 1;
        let currentPenalty = currentCard && currentCard.penalty !== undefined ? currentCard.penalty : 0; 
        
        let myHandStr = '[]';
        if (myPlayerIndex === 0) myHandStr = record.Player0_Hand.value;
        if (myPlayerIndex === 1) myHandStr = record.Player1_Hand.value;
        if (myPlayerIndex === 2) myHandStr = record.Player2_Hand.value;
        const myHand = JSON.parse(myHandStr || '[]');

        const deckCount = record.Deck_Count && record.Deck_Count.value !== undefined ? record.Deck_Count.value : 0;
        
        let turnPlayerName = '';
        let winnerName = '';
        if (currentTurnIndex === -1) {
            turnPlayerName = '🎊 ゲーム終了 🎊';
            if (record.Player0_Hand && JSON.parse(record.Player0_Hand.value || '[]').length === 0) winnerName = players[0] ? players[0].name : 'Player 1';
            else if (record.Player1_Hand && JSON.parse(record.Player1_Hand.value || '[]').length === 0) winnerName = players[1] ? players[1].name : 'Player 2';
            else if (record.Player2_Hand && JSON.parse(record.Player2_Hand.value || '[]').length === 0) winnerName = players[2] ? players[2].name : 'Player 3';
        } else {
            turnPlayerName = players[currentTurnIndex] ? players[currentTurnIndex].name : `Player ${currentTurnIndex}`;
        }

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
            winnerName
        });

        // --- C. ゲーム操作ロジック ---
        if (myPlayerIndex !== -1 && currentTurnIndex !== -1) {
            
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
            
            function executePlayCard(originalCard, cardToPutOnField) {
                const newHand = myHand.filter(c => c.id !== originalCard.id);
                
                let nextTurnIndex = currentTurnIndex;

                if (newHand.length === 0) {
                    alert(`🎉 おめでとうございます！\n${myPlayerName} が手札をすべて出し切って勝利しました！`);
                    nextTurnIndex = -1; 
                } else {
                    let nextDirection = currentDirection;
                    let skipCount = 1;

                    if (cardToPutOnField.type === 'reverse') nextDirection = nextDirection * -1;
                    if (cardToPutOnField.type === 'skip') skipCount = 2;

                    if (cardToPutOnField.type === 'draw2') {
                        cardToPutOnField.penalty = currentPenalty + 2;
                    } else if (cardToPutOnField.type === 'wild_draw4') {
                        cardToPutOnField.penalty = currentPenalty + 4;
                    } else {
                        cardToPutOnField.penalty = 0; 
                    }

                    cardToPutOnField.direction = nextDirection;
                    nextTurnIndex = (currentTurnIndex + (nextDirection * skipCount) + 3) % 3;
                }

                const updateRecord = {
                    Current_Card: { value: JSON.stringify(cardToPutOnField) },
                    Turn_Index: { value: nextTurnIndex }
                };

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
                            
                            for (let i = 0; i < currentPenalty; i++) {
                                if (deck.length > 0) {
                                    myHand.push(deck.pop());
                                } else {
                                    alert('山札が尽きました！');
                                    break;
                                }
                            }

                            const nextTurn = (currentTurnIndex + currentDirection + 3) % 3;
                            
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
                        return; 
                    }

                    // 通常のドロー処理
                    let deck = JSON.parse(record.Deck_Data.value || '[]');
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
                                    playedCard.direction = nextDirection;
                                    playedCard.penalty = nextPenalty;

                                    updateRecord.Current_Card = { value: JSON.stringify(playedCard) };
                                    setHandToUpdateRecord(updateRecord, myPlayerIndex, myHand); 
                                    saveGameData(updateRecord);
                                });
                                return; 
                            } else {
                                drawCard.direction = nextDirection;
                                drawCard.penalty = nextPenalty;

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
                // エラー時無視
            });
        }, 3000);

        return event;
    });

})();
