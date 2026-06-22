export function injectStyles() {
    if (document.getElementById('uno-styles')) return;
    const style = document.createElement('style');
    style.id = 'uno-styles';
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

        /* --- 記号カード用エフェクトスタイル --- */
        .uno-effect-overlay {
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            background: rgba(0, 0, 0, 0.75); z-index: 9999;
            display: flex; flex-direction: column; justify-content: center; align-items: center;
            pointer-events: none; opacity: 0;
            animation: effectFadeInOut 2.5s forwards;
            box-sizing: border-box;
        }
        @keyframes effectFadeInOut {
            0% { opacity: 0; }
            15% { opacity: 1; }
            85% { opacity: 1; }
            100% { opacity: 0; }
        }
        .uno-effect-title {
            font-size: 5rem; font-weight: 900; font-style: italic; margin: 20px 0 10px 0;
            text-shadow: 0 0 20px rgba(255,255,255,0.8), 4px 4px 0px rgba(0,0,0,0.5);
            transform: scale(0.5);
            animation: effectPopIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }
        .uno-effect-subtitle {
            font-size: 1.8rem; color: #ecf0f1; margin: 0; font-weight: bold;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
            opacity: 0;
            animation: fadeIn 0.5s 0.3s forwards;
            text-align: center;
            padding: 0 20px;
        }
        @keyframes effectPopIn {
            to { transform: scale(1); }
        }
        @keyframes fadeIn {
            to { opacity: 1; }
        }

        /* 1. Skip: 禁止マーク */
        .skip-icon {
            font-size: 8rem; color: #e74c3c;
            filter: drop-shadow(0 0 15px #e74c3c);
            animation: skipSpin 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }
        @keyframes skipSpin {
            0% { transform: scale(0) rotate(-180deg); }
            100% { transform: scale(1) rotate(0deg); }
        }

        /* 2. Reverse: 矢印回転 */
        .reverse-icon-container {
            position: relative; width: 150px; height: 150px;
        }
        .reverse-icon {
            font-size: 8rem; color: #3498db;
            filter: drop-shadow(0 0 15px #3498db);
            position: absolute; top: 50%; left: 50%;
            transform: translate(-50%, -50%);
            animation: reverseSpin 2s linear infinite;
        }
        .reverse-icon.ccw {
            animation: reverseSpinCCW 2s linear infinite;
        }
        @keyframes reverseSpin {
            0% { transform: translate(-50%, -50%) rotate(0deg); }
            100% { transform: translate(-50%, -50%) rotate(360deg); }
        }
        @keyframes reverseSpinCCW {
            0% { transform: translate(-50%, -50%) rotate(0deg); }
            100% { transform: translate(-50%, -50%) rotate(-360deg); }
        }

        /* 3. Draw 2: +2 */
        .draw-icon {
            font-size: 8rem; font-weight: 900; color: #f1c40f;
            filter: drop-shadow(0 0 20px #f1c40f);
            animation: drawPulse 0.5s ease-in-out alternate infinite;
        }
        @keyframes drawPulse {
            0% { transform: scale(0.9); }
            100% { transform: scale(1.1); }
        }

        /* 飛び交うカード */
        .flying-card {
            position: absolute; width: 40px; height: 60px;
            border: 2px solid white; border-radius: 4px;
            background-color: #f1c40f; opacity: 0;
            left: calc(50% - 20px); top: calc(50% - 30px);
        }
        .flying-card:nth-child(1) { animation: flyCard1 1.5s ease-out infinite; }
        .flying-card:nth-child(2) { animation: flyCard2 1.5s 0.2s ease-out infinite; }
        .flying-card:nth-child(3) { animation: flyCard3 1.5s 0.4s ease-out infinite; }
        .flying-card:nth-child(4) { animation: flyCard4 1.5s 0.6s ease-out infinite; }
        @keyframes flyCard1 {
            0% { transform: translate(0, 0) rotate(0deg) scale(0.5); opacity: 0; }
            50% { opacity: 1; }
            100% { transform: translate(-120px, -80px) rotate(-45deg) scale(1); opacity: 0; }
        }
        @keyframes flyCard2 {
            0% { transform: translate(0, 0) rotate(0deg) scale(0.5); opacity: 0; }
            50% { opacity: 1; }
            100% { transform: translate(120px, -80px) rotate(45deg) scale(1); opacity: 0; }
        }
        @keyframes flyCard3 {
            0% { transform: translate(0, 0) rotate(0deg) scale(0.5); opacity: 0; }
            50% { opacity: 1; }
            100% { transform: translate(-80px, 120px) rotate(-15deg) scale(1); opacity: 0; }
        }
        @keyframes flyCard4 {
            0% { transform: translate(0, 0) rotate(0deg) scale(0.5); opacity: 0; }
            50% { opacity: 1; }
            100% { transform: translate(80px, 120px) rotate(15deg) scale(1); opacity: 0; }
        }

        /* 4. Wild: 火花 */
        .wild-spark {
            position: absolute; width: 8px; height: 8px; border-radius: 50%; opacity: 0;
        }
        .wild-spark.red { background-color: #e74c3c; box-shadow: 0 0 8px #e74c3c; }
        .wild-spark.blue { background-color: #3498db; box-shadow: 0 0 8px #3498db; }
        .wild-spark.green { background-color: #2ecc71; box-shadow: 0 0 8px #2ecc71; }
        .wild-spark.yellow { background-color: #f1c40f; box-shadow: 0 0 8px #f1c40f; }

        .wild-spark:nth-child(odd) { animation: sparkExplode1 1.5s cubic-bezier(0.1, 0.8, 0.3, 1) infinite; }
        .wild-spark:nth-child(even) { animation: sparkExplode2 1.5s cubic-bezier(0.1, 0.8, 0.3, 1) infinite; }

        @keyframes sparkExplode1 {
            0% { transform: translate(0, 0) scale(1); opacity: 1; }
            100% { transform: translate(var(--tx), var(--ty)) scale(0); opacity: 0; }
        }
        @keyframes sparkExplode2 {
            0% { transform: translate(0, 0) scale(1); opacity: 1; }
            100% { transform: translate(var(--tx), var(--ty)) scale(0); opacity: 0; }
        }

        /* 画面シェイク */
        .screen-shake-effect {
            animation: screenShake 0.4s ease-in-out 3;
        }
        @keyframes screenShake {
            0%, 100% { transform: translate(0, 0); }
            10%, 30%, 50%, 70%, 90% { transform: translate(-6px, -6px); }
            20%, 40%, 60%, 80% { transform: translate(6px, 6px); }
        }
    `;
    document.head.appendChild(style);
}

export function createCardHTML(card) {
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

export function showColorSelector(callback) {
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

export function renderGameBoard(spaceEl, {
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
    hasPlayableCard // ★ NEW: main.js から「出せるカードがあるか」の判定フラグを受け取る
}) {
    const existingContainer = document.getElementById('uno-game-container');
    if (existingContainer) {
        existingContainer.remove();
    }

    injectStyles();
    
    const container = document.createElement('div');
    container.id = 'uno-game-container';

    if (currentPenalty > 0 && currentTurnIndex !== -1 && myPlayerIndex === currentTurnIndex) {
        container.classList.add('danger-mode');
    }

    const directionText = currentDirection === 1 ? '🔄 時計回り' : '🔁 反時計回り';

    let opponentsHTML = '';
    if (opponents && opponents.length > 0) {
        let listHTML = opponents.map(op => {
            let isTurn = op.index === currentTurnIndex ? '<span style="color:#00ff7f;">▶</span> ' : '';
            let countColor = op.handCount <= 2 ? '#e74c3c' : '#f1c40f'; 
            return `<div style="display:inline-block; margin: 0 10px; padding: 10px 20px; background: rgba(0,0,0,0.3); border-radius: 8px; border: 1px solid rgba(255,255,255,0.1);">
                <span style="color: #ecf0f1; font-weight: bold; margin-right: 10px;">${isTurn}${op.name}:</span> 
                <span style="font-weight: bold; font-size: 20px; color: ${countColor};">${op.handCount} <span style="font-size: 14px; color: #bdc3c7;">枚</span></span>
            </div>`;
        }).join('');
        
        opponentsHTML = `
            <div style="text-align:center; margin-bottom: 20px;">
                <p style="margin: 0 0 10px 0; font-size: 14px; color: #7f8c8d; font-weight: bold;">👥 他プレイヤーの手札状況</p>
                ${listHTML}
            </div>
        `;
    }

    let playerAreaHTML = '';
    if (myPlayerIndex !== -1) {
        let handHTML = myHand.map(card => createCardHTML(card)).join('');
        
        let btnHTML = '';
        if (currentTurnIndex === -1) {
            btnHTML = `<div style="color: #f1c40f; font-weight: bold; font-size: 20px;">🏆 このゲームは決着がつきました！お疲れ様でした。</div>`;
        } else if (myPlayerIndex === currentTurnIndex) {
            
            let unoBtnHTML = '';
            // ★ ここで判定！ 手札が2枚 かつ 出せるカードがある(hasPlayableCard === true) 時のみ表示
            if (myHand.length === 2 && hasPlayableCard) {
                unoBtnHTML = `
                    <button id="uno-call-btn" style="padding: 12px 30px; margin-right: 15px; font-size: 16px; background-color: #9b59b6; color: white; border: 2px solid white; border-radius: 8px; font-weight: bold; cursor: pointer; box-shadow: 0 4px 6px rgba(0,0,0,0.5);">
                        📢 UNOと宣言する！
                    </button>
                `;
            }

            if (currentPenalty > 0) {
                btnHTML = `
                    ${unoBtnHTML}
                    <button id="draw-pass-btn" class="btn-danger-pulse" style="padding: 12px 30px; font-size: 16px; background-color: #e74c3c; color: white; border: 2px solid white; border-radius: 8px; font-weight: bold; cursor: pointer;">
                        🚨 ペナルティ ${currentPenalty} 枚引いてターン終了
                    </button>
                `;
            } else {
                btnHTML = `
                    ${unoBtnHTML}
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
            ${currentTurnIndex === -1 
                ? `<h3 style="color:#f1c40f; font-size: 36px; text-shadow: 2px 2px 4px black; margin: 15px 0;">👑 優勝: ${winnerName} 👑</h3><p style="color:#bdc3c7;">ゲーム終了</p>`
                : `<p>現在のターン: <span style="color:#00ff7f; font-weight:bold;">${turnPlayerName}</span> / 山札残り: ${deckCount}枚 / ${directionText}</p>`
            }
            ${currentPenalty > 0 && currentTurnIndex !== -1 ? `<p class="danger-text" style="color:#e74c3c; font-weight:bold;">⚠️ ドロー累積: ${currentPenalty}枚！出せるカードがなければ引いてください</p>` : ''}
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

    container.innerHTML = html;
    spaceEl.appendChild(container);

    if (unoCaller) {
        const cutin = document.createElement('div');
        cutin.className = 'uno-cutin-overlay';
        cutin.innerHTML = `<div class="uno-cutin-text">${unoCaller} が UNO!!</div>`;
        document.body.appendChild(cutin);
        
        setTimeout(() => {
            if (cutin.parentNode) cutin.parentNode.removeChild(cutin);
        }, 3000);
    }

    // ★ NEW: 記号カードのアニメーションエフェクト判定
    if (currentCard && currentCard.playedAt) {
        const lastPlayedKey = 'uno_last_played_at';
        const lastPlayedAt = localStorage.getItem(lastPlayedKey);
        
        if (!lastPlayedAt || Number(currentCard.playedAt) > Number(lastPlayedAt)) {
            if (Date.now() - Number(currentCard.playedAt) < 15000) {
                triggerSpecialCardEffect(currentCard, container);
            }
            localStorage.setItem(lastPlayedKey, currentCard.playedAt);
        }
    }

    return container;
}

// ★ NEW: 記号カードを出したときのエフェクト再生ロジック
function triggerSpecialCardEffect(card, container) {
    if (!card || card.type === 'number') return;

    const overlay = document.createElement('div');
    overlay.className = 'uno-effect-overlay';

    let contentHTML = '';
    let playedByName = card.playedBy || '誰か';
    let cardColorName = '';
    switch(card.color) {
        case 'red': cardColorName = '赤'; break;
        case 'blue': cardColorName = '青'; break;
        case 'green': cardColorName = '緑'; break;
        case 'yellow': cardColorName = '黄'; break;
        default: cardColorName = 'カラー選択';
    }

    if (card.type === 'skip') {
        overlay.style.border = '10px solid #e74c3c';
        contentHTML = `
            <div class="skip-icon">⊘</div>
            <h1 class="uno-effect-title" style="color: #e74c3c;">SKIP!!</h1>
            <p class="uno-effect-subtitle">${playedByName} がスキップを発動！次の人の手番はスキップされます</p>
        `;
    } else if (card.type === 'reverse') {
        const isCCW = card.direction === -1;
        const arrowDirectionText = isCCW ? '反時計回り (左回り)' : '時計回り (右回り)';
        overlay.style.border = '10px solid #3498db';
        contentHTML = `
            <div class="reverse-icon-container">
                <div class="reverse-icon ${isCCW ? 'ccw' : ''}">🔄</div>
            </div>
            <h1 class="uno-effect-title" style="color: #3498db;">REVERSE!!</h1>
            <p class="uno-effect-subtitle">手番の順序が逆転！ ${arrowDirectionText} になりました</p>
        `;
    } else if (card.type === 'draw2') {
        overlay.style.border = '10px solid #f1c40f';
        let cardsHTML = '';
        for (let i = 0; i < 4; i++) {
            cardsHTML += `<div class="flying-card"></div>`;
        }
        contentHTML = `
            <div style="position: relative; width: 100px; height: 100px; display: flex; justify-content: center; align-items: center;">
                <div class="draw-icon">+2</div>
                ${cardsHTML}
            </div>
            <h1 class="uno-effect-title" style="color: #f1c40f;">DRAW 2!!</h1>
            <p class="uno-effect-subtitle">${playedByName} がドロー2！次の人は2枚引くか、ドローカードを重ねてください</p>
        `;
    } else if (card.type === 'wild') {
        overlay.style.border = '10px solid #9b59b6';
        let sparksHTML = '';
        const colors = ['red', 'blue', 'green', 'yellow'];
        for (let i = 0; i < 20; i++) {
            const color = colors[i % 4];
            const angle = (i / 20) * 2 * Math.PI;
            const distance = 100 + Math.random() * 100;
            const tx = Math.cos(angle) * distance;
            const ty = Math.sin(angle) * distance;
            sparksHTML += `<div class="wild-spark ${color}" style="--tx: ${tx}px; --ty: ${ty}px; left: calc(50% - 4px); top: calc(50% - 4px); animation-delay: ${Math.random() * 0.3}s;"></div>`;
        }
        contentHTML = `
            <div style="position: relative; width: 100px; height: 100px; display: flex; justify-content: center; align-items: center;">
                <div class="draw-icon" style="color: #9b59b6; filter: drop-shadow(0 0 20px #9b59b6);">W</div>
                ${sparksHTML}
            </div>
            <h1 class="uno-effect-title" style="color: #f1c40f; text-shadow: 0 0 20px #9b59b6, 3px 3px 0px black;">WILD!!</h1>
            <p class="uno-effect-subtitle">指定された色は 「${cardColorName}」 です！</p>
        `;
    } else if (card.type === 'wild_draw4') {
        overlay.style.border = '10px solid #e67e22';
        
        if (container) {
            container.classList.add('screen-shake-effect');
            setTimeout(() => {
                container.classList.remove('screen-shake-effect');
            }, 1200);
        }

        let sparksHTML = '';
        const colors = ['red', 'blue', 'green', 'yellow'];
        for (let i = 0; i < 24; i++) {
            const color = colors[i % 4];
            const angle = (i / 24) * 2 * Math.PI;
            const distance = 120 + Math.random() * 120;
            const tx = Math.cos(angle) * distance;
            const ty = Math.sin(angle) * distance;
            sparksHTML += `<div class="wild-spark ${color}" style="--tx: ${tx}px; --ty: ${ty}px; left: calc(50% - 4px); top: calc(50% - 4px); animation-delay: ${Math.random() * 0.2}s;"></div>`;
        }

        let cardsHTML = '';
        for (let i = 0; i < 4; i++) {
            cardsHTML += `<div class="flying-card" style="background-color: #e67e22;"></div>`;
        }

        contentHTML = `
            <div style="position: relative; width: 100px; height: 100px; display: flex; justify-content: center; align-items: center;">
                <div class="draw-icon" style="color: #e67e22; filter: drop-shadow(0 0 30px #e67e22); font-size: 7rem;">+4</div>
                ${sparksHTML}
                ${cardsHTML}
            </div>
            <h1 class="uno-effect-title" style="color: #e74c3c; text-shadow: 0 0 25px #e67e22, 4px 4px 0px black; font-size: 6rem;">WILD DRAW 4!!!</h1>
            <p class="uno-effect-subtitle">${playedByName} がワイルドドロー4を発動！色は「${cardColorName}」になり、次の人は4枚引きます！</p>
        `;
    }

    overlay.innerHTML = contentHTML;
    document.body.appendChild(overlay);

    setTimeout(() => {
        if (overlay.parentNode) {
            overlay.parentNode.removeChild(overlay);
        }
    }, 2500);
}