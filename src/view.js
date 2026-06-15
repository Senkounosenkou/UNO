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

        /* アニメーション定義 (Keyframes) */
        
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
    winnerName
}) {
    const existingContainer = document.getElementById('uno-game-container');
    if (existingContainer) {
        existingContainer.remove();
    }

    injectStyles();
    
    const container = document.createElement('div');
    container.id = 'uno-game-container';

    // ドローのスタックがあり、かつ「自分のターン」の場合は画面全体を危険モードにする
    if (currentPenalty > 0 && currentTurnIndex !== -1 && myPlayerIndex === currentTurnIndex) {
        container.classList.add('danger-mode');
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
                // ペナルティを受けるボタンに「btn-danger-pulse（波動）」クラスを追加
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
                <!-- 場札を animate-drop クラスで囲んで落下アニメーションをつける -->
                <div class="animate-drop">
                    ${createCardHTML(currentCard)}
                </div>
            </div>
        </div>
        
        ${playerAreaHTML}
    `;

    container.innerHTML = html;
    spaceEl.appendChild(container);
    return container;
}
