import { describe, it, expect } from 'vitest';
import { createDeck, shuffleDeck, canPlayCard, getCardName } from './model.js';

describe('UNO Model (Business Logic)', () => {
    describe('createDeck', () => {
        it('should create a deck with 108 cards', () => {
            const deck = createDeck();
            expect(deck.length).toBe(108);
        });

        it('should generate cards with a unique random id', () => {
            const deck = createDeck();
            const ids = deck.map(c => c.id);
            const uniqueIds = new Set(ids);
            expect(uniqueIds.size).toBe(ids.length);
        });
    });

    describe('shuffleDeck', () => {
        it('should maintain the same number of cards after shuffling', () => {
            const deck = createDeck();
            const originalLength = deck.length;
            const shuffled = shuffleDeck([...deck]);
            expect(shuffled.length).toBe(originalLength);
        });
    });

    describe('canPlayCard', () => {
        it('should allow playing a card with the same color', () => {
            const currentCard = { type: 'number', color: 'red', value: 3 };
            const playCard = { type: 'number', color: 'red', value: 5 };
            expect(canPlayCard(playCard, currentCard)).toBe(true);
        });

        it('should allow playing a card with the same value', () => {
            const currentCard = { type: 'number', color: 'red', value: 3 };
            const playCard = { type: 'number', color: 'blue', value: 3 };
            expect(canPlayCard(playCard, currentCard)).toBe(true);
        });

        it('should allow playing a card with the same type for action cards', () => {
            const currentCard = { type: 'skip', color: 'red', value: null };
            const playCard = { type: 'skip', color: 'blue', value: null };
            expect(canPlayCard(playCard, currentCard)).toBe(true);
        });

        it('should allow playing wild cards anytime when no penalty is active', () => {
            const currentCard = { type: 'number', color: 'red', value: 3 };
            const wildCard = { type: 'wild', color: null, value: null };
            const wildDraw4Card = { type: 'wild_draw4', color: null, value: null };
            expect(canPlayCard(wildCard, currentCard)).toBe(true);
            expect(canPlayCard(wildDraw4Card, currentCard)).toBe(true);
        });

        it('should reject playing a card with different color, value and type', () => {
            const currentCard = { type: 'number', color: 'red', value: 3 };
            const playCard = { type: 'number', color: 'blue', value: 5 };
            expect(canPlayCard(playCard, currentCard)).toBe(false);
        });

        it('should enforce stack rule when penalty is active', () => {
            const currentCard = { type: 'draw2', color: 'red', value: null };
            
            // ペナルティがある場合、同じ draw2 なら出せる
            const sameTypeCard = { type: 'draw2', color: 'blue', value: null };
            expect(canPlayCard(sameTypeCard, currentCard, 2)).toBe(true);

            // 同じ色であっても、数字カードなどは出せない
            const sameColorNumberCard = { type: 'number', color: 'red', value: 3 };
            expect(canPlayCard(sameColorNumberCard, currentCard, 2)).toBe(false);

            // ワイルドカードであっても、draw4でなければ出せない (typeが異なるため)
            const wildCard = { type: 'wild', color: null, value: null };
            expect(canPlayCard(wildCard, currentCard, 2)).toBe(false);
        });
    });

    describe('getCardName', () => {
        it('should return correct Japanese card name', () => {
            expect(getCardName({ type: 'number', color: 'red', value: 5 })).toBe('赤の5');
            expect(getCardName({ type: 'skip', color: 'blue', value: null })).toBe('青のスキップ');
            expect(getCardName({ type: 'reverse', color: 'green', value: null })).toBe('緑のリバース');
            expect(getCardName({ type: 'draw2', color: 'yellow', value: null })).toBe('黄のドロー2');
            expect(getCardName({ type: 'wild', color: null, value: null })).toBe('ワイルド');
            expect(getCardName({ type: 'wild_draw4', color: null, value: null })).toBe('ワイルド ドロー4');
        });
    });
});
