import { COLORS } from './constants.js';

export function generateId() {
    return Math.random().toString(36).substring(2, 9);
}

export function createDeck() {
    const deck = [];
    
    COLORS.forEach(function(color) {
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

export function shuffleDeck(deck) {
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = deck[i];
        deck[i] = deck[j];
        deck[j] = temp;
    }
    return deck;
}

export function canPlayCard(playCard, currentCard, currentPenalty = 0) {
    // ペナルティが累積している時は、同じタイプのドローカードしか出せない（スタックルール）
    if (currentPenalty > 0) {
        return playCard.type === currentCard.type;
    }

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

export function getCardName(card) {
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

