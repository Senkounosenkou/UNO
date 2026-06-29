import { createDeck, shuffleDeck, canPlayCard, getCardName } from './model.js';
import { renderGameBoard, showColorSelector, triggerVictoryEffect } from './view.js';

(function() {
    'use strict';

    /**
     * 山札から指定された枚数カードを引きます。
     * もし途中で山札が0枚になった場合、kintone側に新たな「捨て札」フィールドを追加することなく、
     * 全カード（108枚）から、現在全プレイヤーの手札にあるカードと現在の場札を逆算して除外した
     * 「使用済みの捨て札」を自動で割り出し、シャッフルして山札を再構築します。
     */
    function getCardsFromDeck(deck, count, allHands, currentCard) {
        const drawnCards = [];
        let currentDeck = deck ? [...deck] : [];
        
        for (let i = 0; i < count; i++) {
            if (currentDeck.length === 0) {
                console.log("山札が空になりました。手札と場札以外のカードをシャッフルして山札を再構築します。");
                
                // 1. UNO全カード（108枚）の初期リストを作成
                const fullDeck = createDeck();
                
                // 2. 現在ゲーム中に存在しており、山札に戻してはいけないカードのIDを収集
                const activeCardIds = new Set();
                
                // 現在の場札のIDを除外対象にする
                if (currentCard && currentCard.id) {
                    activeCardIds.add(currentCard.id);
                }
                
                // 各プレイヤーの手札にあるカードのIDを除外対象にする
                Object.keys(allHands).forEach(playerCode => {
                    const hand = allHands[playerCode] || [];
                    hand.forEach(card => {
                        if (card && card.id) {
                            activeCardIds.add(card.id);
                        }
                    });
                });
                
                // この瞬間に既に引かれた（drawnCards内にある）カードも除外対象にする
                drawnCards.forEach(card => {
                    if (card && card.id) {
                        activeCardIds.add(card.id);
                    }
                });
                
                // 3. 全カードからゲーム中のカードを除外（＝これが捨て札）
                const recycledCards = fullDeck.filter(card => !activeCardIds.has(card.id));
                
                // 4. シャッフルして新しい山札としてセット
                currentDeck = shuffleDeck(recycledCards);
                
                // 万が一、全カードが手札と場札を埋め尽くしており、引くカードが物理的に残っていない極端なケース
                if (currentDeck.length === 0) {
                    console.warn("山札を再構築できません。引けるカードが残っていません。");
                    break;
                }
            }
            drawnCards.push(currentDeck.pop());
        }
        return { drawnCards, newDeck: currentDeck };
    }

    kintone.events.on('app.record.detail.show', function(event) {
        const record = event.record;
        
        // 没入感モード（不要になった旧手札フィールドと全手札データフィールドを非表示）
        const hideFields = [
            'GameID', 'Current_Card', 'Deck_Count', 'Turn_Index', 'Players', 
            'Deck_Data', 'Hands_Data', 'Player0_Hand', 'Player1_Hand', 'Player2_Hand'
        ];
        hideFields.forEach(function(fieldCode) {
            kintone.app.record.setFieldShown(fieldCode, false);
        });

        // 描画エリアの取得
        const spaceEl = kintone.app.record.getSpaceElement('game_board_space');
        if (!spaceEl) return event;

        // --- 1. 手札保存フィールド（Hands_Data）の存在確認 ---
        if (record.Hands_Data === undefined) {
            spaceEl.innerHTML = `
                <div style="padding: 25px; background: #ff7675; color: white; border-radius: 8px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 15px rgba(0,0,0,0.2); max-width: 700px; margin: 20px auto; font-family: sans-serif;">
                    <h3 style="margin-top: 0; font-size: 18px; border-bottom: 2px solid rgba(255,255,255,0.3); padding-bottom: 10px;">⚠️ 設定エラー: 手札保存用フィールドが不足しています</h3>
                    <p style="margin-top: 15px; font-weight: normal; font-size: 14px; line-height: 1.6;">
                        プレイヤー数（2人〜何人でも）に動的対応して新設計で遊ぶために、kintoneアプリの設定に新しいフィールドを1つだけ追加する必要があります。<br><br>
                        <strong>【設定手順】</strong><br>
                        1. アプリの設定 ＞ <strong>フォーム</strong> 変更画面を開きます。<br>
                        2. 左メニューから <strong>「文字列（複数行）」</strong> フィールドをドラッグ＆ドロップで追加します。<br>
                        3. 追加したフィールドの設定を開き、フィールド名と<strong>フィールドコード</strong>の両方を <strong><span style="background: rgba(0,0,0,0.3); padding: 2px 6px; border-radius: 4px; font-family: monospace; font-weight: bold;">Hands_Data</span></strong> に変更します。<br>
                        4. フォームを保存し、アプリの <strong>「アプリを更新」</strong> ボタンをクリックして適用してください。
                    </p>
                </div>
            `;
            return event;
        }

        const players = record.Players && record.Players.value ? record.Players.value : [];
        const playerCount = players.length;

        if (playerCount === 0) {
            spaceEl.innerHTML = '<div style="padding: 20px; color: #ff4757; font-weight: bold; background: rgba(0,0,0,0.1); border-radius: 8px; text-align: center;">⚠️ プレイヤーが同期されていません。一度ロビーからゲームを正しく開始し直すか、盤面アプリにPlayers(ユーザー選択)が設定されていることを確認してください。</div>';
            return event;
        }

        // --- 2. 不整合の検知 ＆ 初期化判定ロジック ---
        let needsInitialization = false;
        let parsedHands = {};
        try {
            if (!record.Deck_Data || !record.Deck_Data.value || !record.Hands_Data || !record.Hands_Data.value) {
                needsInitialization = true;
            } else {
                parsedHands = JSON.parse(record.Hands_Data.value);
                
                // 参加プレイヤー全員分の手札キーがHands_Dataに存在しているかチェック
                const hasAllPlayersHand = players.every(p => parsedHands[p.code] !== undefined);
                if (!hasAllPlayersHand) {
                    needsInitialization = true;
                }
                
                // 【超重要】整合性チェック: 
                // ゲーム中（Turn_Indexが終了状態 -1 ではない）なのに、登録されている全員の手札の合計が0枚である場合、
                // 前回のバグによる不整合状態と判断して、安全に自動で初期配札（リセット）に移行します。
                const totalHandCount = Object.keys(parsedHands).reduce((sum, key) => sum + (parsedHands[key] ? parsedHands[key].length : 0), 0);
                const currentTurnIndexVal = record.Turn_Index && record.Turn_Index.value !== undefined ? Number(record.Turn_Index.value) : 0;
                if (totalHandCount === 0 && currentTurnIndexVal !== -1) {
                    needsInitialization = true;
                }
            }
        } catch (e) {
            needsInitialization = true;
        }

        // --- A. まだ初期化されていない、または不整合な状態の場合 ---
        if (needsInitialization) {
            let deck = createDeck();
            deck = shuffleDeck(deck);
            
            // 参加している全プレイヤー分の手札枠を動的に生成
            const playersHands = {};
            players.forEach(p => {
                playersHands[p.code] = [];
            });

            // 全員に7枚ずつ均等にカードを配る
            for (let i = 0; i < 7; i++) {
                players.forEach(p => {
                    if (deck.length > 0) {
                        playersHands[p.code].push(deck.pop());
                    }
                });
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
                    Hands_Data: { value: JSON.stringify(playersHands) }, // 同期されたプレイヤー手札を完全に格納
                    Turn_Index: { value: 0 }
                }
            };

            kintone.api(kintone.api.url('/k/v1/record.json', true), 'PUT', updateParams).then(function() {
                location.reload();
            }).catch(function(error) {
                console.error(error);
                alert('⚠️ ゲームの初期化に失敗しました。詳細エラーをデベロッパーツールで確認してください。');
            });
            return event;
        }

        // --- B. 初期化済みの場合：ゲームUIを描画する ---
        spaceEl.innerHTML = '';

        const loginUser = kintone.getLoginUser();
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
        
        // 全プレイヤーの手札データをパース
        const allHands = JSON.parse(record.Hands_Data.value);
        const myHand = allHands[loginUser.code] || [];

        // 他のプレイヤーの手札枚数を動的に集計
        const opponents = [];
        players.forEach(function(p, index) {
            if (p.code !== loginUser.code) {
                const playerHand = allHands[p.code] || [];
                opponents.push({
                    name: p.name,
                    index: index,
                    handCount: playerHand.length
                });
            }
        });

        const deckCount = record.Deck_Count && record.Deck_Count.value !== undefined ? record.Deck_Count.value : 0;
        
        let turnPlayerName = '';
        let winnerName = '';
        if (currentTurnIndex === -1) {
            turnPlayerName = '🎊 ゲーム終了 🎊';
            // 手札が0枚になったプレイヤーを特定
            const winnerPlayer = players.find(p => (allHands[p.code] || []).length === 0);
            winnerName = winnerPlayer ? winnerPlayer.name : '不明なプレイヤー';
        } else {
            turnPlayerName = players[currentTurnIndex] ? players[currentTurnIndex].name : `Player ${currentTurnIndex}`;
        }

        // ゲーム終了時の勝利演出
        if (currentTurnIndex === -1 && winnerName && currentCard && currentCard.playedAt) {
            const victoryShownKey = 'uno_victory_shown_at';
            const lastVictoryAt = localStorage.getItem(victoryShownKey);
            const cardPlayedAt = Number(currentCard.playedAt);

            if ((!lastVictoryAt || cardPlayedAt > Number(lastVictoryAt)) && (Date.now() - cardPlayedAt < 15000)) {
                localStorage.setItem(victoryShownKey, cardPlayedAt);
                setTimeout(() => {
                    triggerVictoryEffect(winnerName);
                }, 500);
            }
        }

        // 手札が2枚のとき、出せるカードがあるか判定
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
            opponents,
            hasPlayableCard
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

            // 動的にHands_Dataの中の該当プレイヤー手札を更新するヘルパー
            function setHandToUpdateRecord(updateRecord, playerCode, handData) {
                const currentAllHands = JSON.parse(record.Hands_Data.value || '{}');
                currentAllHands[playerCode] = handData;
                updateRecord.Hands_Data = { value: JSON.stringify(currentAllHands) };
            }
            
            function executePlayCard(originalCard, cardToPutOnField) {
                const newHand = myHand.filter(c => c.id !== originalCard.id);
                
                let deck = JSON.parse(record.Deck_Data.value || '[]');
                let penaltyApplied = false;

                if (myHand.length === 2 && newHand.length === 1 && !hasCalledUno) {
                    alert('🚨 UNOと宣言せずに残り1枚になりました！ペナルティとして山札から2枚引かされます。');
                    
                    // リサイクル対応のドローヘルパーを使用
                    const drawResult = getCardsFromDeck(deck, 2, allHands, currentCard);
                    drawResult.drawnCards.forEach(c => newHand.push(c));
                    deck = drawResult.newDeck;

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
                    nextTurnIndex = -1; 
                } else {
                    let nextDirection = currentDirection;
                    let skipCount = 1;

                    // 2人プレイ時のリバースは特殊ルール（もう一回自分のターン＝スキップと同じ処理にする）
                    if (cardToPutOnField.type === 'reverse') {
                        if (playerCount === 2) {
                            skipCount = 2;
                        } else {
                            nextDirection = nextDirection * -1;
                        }
                    }
                    if (cardToPutOnField.type === 'skip') skipCount = 2;

                    if (cardToPutOnField.type === 'draw2') {
                        cardToPutOnField.penalty = currentPenalty + 2;
                    } else if (cardToPutOnField.type === 'wild_draw4') {
                        cardToPutOnField.penalty = currentPenalty + 4;
                    } else {
                        cardToPutOnField.penalty = 0; 
                    }

                    cardToPutOnField.direction = nextDirection;
                    // 動的なプレイヤー数（playerCount）で次のターンのインデックスを計算
                    nextTurnIndex = (currentTurnIndex + (nextDirection * skipCount) + playerCount * 2) % playerCount;
                }

                cardToPutOnField.playedAt = Date.now();
                cardToPutOnField.playedBy = myPlayerName;

                const updateRecord = {
                    Current_Card: { value: JSON.stringify(cardToPutOnField) },
                    Turn_Index: { value: nextTurnIndex }
                };

                if (penaltyApplied) {
                    updateRecord.Deck_Data = { value: JSON.stringify(deck) };
                    updateRecord.Deck_Count = { value: deck.length };
                }

                setHandToUpdateRecord(updateRecord, loginUser.code, newHand);
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

                    // ドロー2/4ペナルティを受けてパスする場合
                    if (currentPenalty > 0) {
                        if (confirm(`重ねて出せるカードがありませんか？\nペナルティとして ${currentPenalty} 枚引いてターンを終了します。`)) {
                            let deck = JSON.parse(record.Deck_Data.value || '[]');
                            
                            // リサイクル対応のドローヘルパーを使用
                            const drawResult = getCardsFromDeck(deck, currentPenalty, allHands, currentCard);
                            drawResult.drawnCards.forEach(c => myHand.push(c));
                            deck = drawResult.newDeck;

                            const nextTurn = (currentTurnIndex + currentDirection + playerCount) % playerCount;
                            const resetCard = Object.assign({}, currentCard);
                            resetCard.penalty = 0;
                            delete resetCard.unoCallTrigger;

                            const updateRecord = {
                                Current_Card: { value: JSON.stringify(resetCard) },
                                Deck_Data: { value: JSON.stringify(deck) },
                                Deck_Count: { value: deck.length },
                                Turn_Index: { value: nextTurn }
                            };
                            
                            setHandToUpdateRecord(updateRecord, loginUser.code, myHand);
                            saveGameData(updateRecord);
                        }
                        return; 
                    }

                    let deck = JSON.parse(record.Deck_Data.value || '[]');
                    
                    // リサイクル対応のドローヘルパーを使用して1枚引く
                    const drawResult = getCardsFromDeck(deck, 1, allHands, currentCard);
                    if (drawResult.drawnCards.length === 0) {
                        alert('引けるカードがありません！');
                        return;
                    }
                    const drawCard = drawResult.drawnCards[0];
                    deck = drawResult.newDeck;

                    const nextTurn = (currentTurnIndex + currentDirection + playerCount) % playerCount;
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

                            if (drawCard.type === 'reverse') {
                                if (playerCount === 2) {
                                    skipCount = 2;
                                } else {
                                    nextDirection = nextDirection * -1;
                                }
                            }
                            if (drawCard.type === 'skip') skipCount = 2;

                            let nextPenalty = 0;
                            if (drawCard.type === 'draw2') {
                                nextPenalty = currentPenalty + 2;
                            } else if (drawCard.type === 'wild_draw4') {
                                nextPenalty = currentPenalty + 4;
                            }

                            const actualNextTurn = (currentTurnIndex + (nextDirection * skipCount) + playerCount * 2) % playerCount;
                            
                            if (myHand.length === 0) {
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
                                    playedCard.playedAt = Date.now();
                                    playedCard.playedBy = myPlayerName;
                                    delete playedCard.unoCallTrigger; 

                                    updateRecord.Current_Card = { value: JSON.stringify(playedCard) };
                                    setHandToUpdateRecord(updateRecord, loginUser.code, myHand); 
                                    saveGameData(updateRecord);
                                });
                                return; 
                            } else {
                                drawCard.direction = nextDirection;
                                drawCard.penalty = nextPenalty;
                                drawCard.playedAt = Date.now();
                                drawCard.playedBy = myPlayerName;
                                delete drawCard.unoCallTrigger;

                                updateRecord.Current_Card = { value: JSON.stringify(drawCard) };
                                setHandToUpdateRecord(updateRecord, loginUser.code, myHand); 
                                saveGameData(updateRecord);
                                return;
                            }
                        }
                    } else {
                        alert(`引いたカードは「${cardName}」でした。\n場に出せないため、手札に加えてターンを終了します。`);
                    }

                    myHand.push(drawCard);
                    setHandToUpdateRecord(updateRecord, loginUser.code, myHand);
                    
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