import { createDeck, shuffleDeck, canPlayCard, getCardName } from './model.js';
import { renderGameBoard, showColorSelector } from './view.js';

(function() {
    'use strict';

    kintone.events.on('app.record.detail.show', function(event) {
        const record = event.record;
        
        // 没入感モード
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
        
        let unoCaller = currentCard && currentCard.unoCallTrigger ? currentCard.unoCallTrigger : null;
        
        let myHandStr = '[]';
        if (myPlayerIndex === 0) myHandStr = record.Player0_Hand.value;
        if (myPlayerIndex === 1) myHandStr = record.Player1_Hand.value;
        if (myPlayerIndex === 2) myHandStr = record.Player2_Hand.value;
        const myHand = JSON.parse(myHandStr || '[]');

        // ★ NEW: 他のプレイヤーの手札枚数を計算してまとめる
        const player0Hand = JSON.parse(record.Player0_Hand && record.Player0_Hand.value ? record.Player0_Hand.value : '[]');
        const player1Hand = JSON.parse(record.Player1_Hand && record.Player1_Hand.value ? record.Player1_Hand.value : '[]');
        const player2Hand = JSON.parse(record.Player2_Hand && record.Player2_Hand.value ? record.Player2_Hand.value : '[]');

        const opponents = [];
        players.forEach(function(p, index) {
            if (index !== myPlayerIndex) {
                let handCount = 0;
                if (index === 0) handCount = player0Hand.length;
                if (index === 1) handCount = player1Hand.length;
                if (index === 2) handCount = player2Hand.length;
                
                opponents.push({
                    name: p.name,
                    index: index,
                    handCount: handCount
                });
            }
        });

        const deckCount = record.Deck_Count && record.Deck_Count.value !== undefined ? record.Deck_Count.value : 0;
        
        let turnPlayerName = '';
        let winnerName = '';
        if (currentTurnIndex === -1) {
            turnPlayerName = '🎊 ゲーム終了 🎊';
            if (player0Hand.length === 0) winnerName = players[0] ? players[0].name : 'Player 1';
            else if (player1Hand.length === 0) winnerName = players[1] ? players[1].name : 'Player 2';
            else if (player2Hand.length === 0) winnerName = players[2] ? players[2].name : 'Player 3';
        } else {
            turnPlayerName = players[currentTurnIndex] ? players[currentTurnIndex].name : `Player ${currentTurnIndex}`;
        }

        // ★ NEW: 手札が2枚のとき、出せるカードがあるか判定する
        let hasPlayableCard = false;
        if (myHand.length === 2 && myPlayerIndex === currentTurnIndex) {
            hasPlayableCard = myHand.some(card => canPlayCard(card, currentCard, currentPenalty));
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
            winnerName,
            unoCaller,
            opponents, // ★ NEW: 計算した対戦相手の情報をUI描画関数へ渡す
            hasPlayableCard // ★ NEW: 出せるカードがあるかどうかのフラグを渡す
        });

        // --- C. ゲーム操作ロジック ---
        if (myPlayerIndex !== -1 && currentTurnIndex !== -1) {
            
            let hasCalledUno = false;
            
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
                
                let deck = JSON.parse(record.Deck_Data.value || '[]');
                let penaltyApplied = false;

                if (myHand.length === 2 && newHand.length === 1 && !hasCalledUno) {
                    alert('🚨 UNOと宣言せずに残り1枚になりました！ペナルティとして山札から2枚引かされます。');
                    for (let i = 0; i < 2; i++) {
                        if (deck.length > 0) newHand.push(deck.pop());
                    }
                    penaltyApplied = true;
                    delete cardToPutOnField.unoCallTrigger; 
                } 
                else if (myHand.length === 2 && newHand.length === 1 && hasCalledUno) {
                    cardToPutOnField.unoCallTrigger = myPlayerName;
                } 
                else {
                    delete cardToPutOnField.unoCallTrigger;
                }
                
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

                if (penaltyApplied) {
                    updateRecord.Deck_Data = { value: JSON.stringify(deck) };
                    updateRecord.Deck_Count = { value: deck.length };
                }

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

                    if (currentPenalty > 0) {
                        if (confirm(`重ねて出せるカードがありませんか？\nペナルティとして ${currentPenalty} 枚引いてターンを終了します。`)) {
                            let deck = JSON.parse(record.Deck_Data.value || '[]');
                            for (let i = 0; i < currentPenalty; i++) {
                                if (deck.length > 0) myHand.push(deck.pop());
                            }

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
                    } else {
                        alert(`引いたカードは「${cardName}」でした。\n場に出せないため、手札に加えてターンを終了します。`);
                    }

                    myHand.push(drawCard);
                    setHandToUpdateRecord(updateRecord, myPlayerIndex, myHand);
                    
                    const currentCardObj = JSON.parse(record.Current_Card.value || '{}');
                    if(currentCardObj.unoCallTrigger) {
                        delete currentCardObj.unoCallTrigger;
                        updateRecord.Current_Card = { value: JSON.stringify(currentCardObj) };
                    }
                    saveGameData(updateRecord);
                });
            }

            const unoBtn = document.getElementById('uno-call-btn');
            if (unoBtn) {
                unoBtn.addEventListener('click', function() {
                    hasCalledUno = true;
                    unoBtn.innerText = '✅ UNO宣言済み！';
                    unoBtn.style.backgroundColor = '#2ecc71';
                    unoBtn.disabled = true; 
                });
            }
        }

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
            }).catch(function(err) {});
        }, 3000);

        return event;
    });

})();