
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Point, Direction } from './types';
import { 
  CELL_SIZE, 
  GRID_WIDTH, 
  GRID_HEIGHT, 
  GAME_WIDTH, 
  GAME_HEIGHT, 
  FPS, 
  COLORS 
} from './constants';

const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(Number(localStorage.getItem('snake-highscore')) || 0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const currentUrl = window.location.href;

  const snakeRef = useRef<Point[]>([{ x: Math.floor(GRID_WIDTH / 2), y: 8 }]);
  const directionRef = useRef<Direction>('RIGHT');
  const nextDirectionRef = useRef<Direction>('RIGHT');
  const foodRef = useRef<Point>({ x: 5, y: 5 });
  const gameLoopRef = useRef<number | null>(null);

  const triggerVibrate = (pattern: number | number[]) => {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        textArea.style.top = "0";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopied(true);
      triggerVibrate(30);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Copy failed', err);
    }
  };

  const generateFood = useCallback((snake: Point[]): Point => {
    let newFood: Point;
    while (true) {
      newFood = {
        x: Math.floor(Math.random() * GRID_WIDTH),
        y: Math.floor(Math.random() * GRID_HEIGHT)
      };
      const isOnSnake = snake.some(segment => segment.x === newFood.x && segment.y === newFood.y);
      if (!isOnSnake) break;
    }
    return newFood;
  }, []);

  const resetGame = useCallback(() => {
    snakeRef.current = [{ x: Math.floor(GRID_WIDTH / 2), y: 8 }];
    directionRef.current = 'RIGHT';
    nextDirectionRef.current = 'RIGHT';
    foodRef.current = generateFood(snakeRef.current);
    setScore(0);
    setIsGameOver(false);
    triggerVibrate(50);
  }, [generateFood]);

  const update = useCallback(() => {
    if (isGameOver) return;

    directionRef.current = nextDirectionRef.current;
    const head = snakeRef.current[0];
    let newHead: Point = { ...head };

    switch (directionRef.current) {
      case 'UP': newHead.y -= 1; break;
      case 'DOWN': newHead.y += 1; break;
      case 'LEFT': newHead.x -= 1; break;
      case 'RIGHT': newHead.x += 1; break;
    }

    if (newHead.x < 0 || newHead.x >= GRID_WIDTH || newHead.y < 0 || newHead.y >= GRID_HEIGHT ||
        snakeRef.current.some(segment => segment.x === newHead.x && segment.y === newHead.y)) {
      setIsGameOver(true);
      triggerVibrate([150, 50, 150]);
      return;
    }

    const newSnake = [newHead, ...snakeRef.current];

    if (newHead.x === foodRef.current.x && newHead.y === foodRef.current.y) {
      setScore(prev => prev + 10);
      triggerVibrate(25);
      foodRef.current = generateFood(newSnake);
    } else {
      newSnake.pop();
    }

    snakeRef.current = newSnake;
  }, [generateFood, isGameOver]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    ctx.strokeStyle = '#111111';
    ctx.lineWidth = 1;
    for (let i = 0; i <= GRID_WIDTH; i++) {
        ctx.beginPath(); ctx.moveTo(i * CELL_SIZE, 0); ctx.lineTo(i * CELL_SIZE, GAME_HEIGHT); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i * CELL_SIZE); ctx.lineTo(GAME_WIDTH, i * CELL_SIZE); ctx.stroke();
    }

    const radius = CELL_SIZE / 2;
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#ff4757';
    ctx.fillStyle = '#ff4757';
    ctx.beginPath(); ctx.arc(foodRef.current.x * CELL_SIZE + radius, foodRef.current.y * CELL_SIZE + radius, radius - 8, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;

    snakeRef.current.forEach((segment, i) => {
      const cx = segment.x * CELL_SIZE + radius;
      const cy = segment.y * CELL_SIZE + radius;
      if (i === 0) {
        ctx.fillStyle = '#00ff88';
        ctx.beginPath(); ctx.arc(cx, cy, radius - 2, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'black';
        ctx.beginPath(); ctx.arc(cx - 8, cy - 6, 4, 0, Math.PI * 2); ctx.arc(cx + 8, cy - 6, 4, 0, Math.PI * 2); ctx.fill();
      } else {
        const opacity = 1 - (i / snakeRef.current.length) * 0.5;
        ctx.fillStyle = `rgba(0, 255, 136, ${opacity})`;
        ctx.beginPath(); ctx.arc(cx, cy, radius - 5, 0, Math.PI * 2); ctx.fill();
      }
    });
  }, []);

  useEffect(() => {
    const tick = () => { update(); draw(); };
    gameLoopRef.current = window.setInterval(tick, 1000 / FPS);
    return () => { if (gameLoopRef.current) clearInterval(gameLoopRef.current); };
  }, [update, draw]);

  useEffect(() => {
    if (isGameOver && score > highScore) {
      setHighScore(score);
      localStorage.setItem('snake-highscore', score.toString());
    }
  }, [isGameOver, score, highScore]);

  const handleControl = (dir: Direction) => {
    triggerVibrate(10);
    if (isGameOver) return;
    if (dir === 'UP' && directionRef.current !== 'DOWN') nextDirectionRef.current = 'UP';
    if (dir === 'DOWN' && directionRef.current !== 'UP') nextDirectionRef.current = 'DOWN';
    if (dir === 'LEFT' && directionRef.current !== 'RIGHT') nextDirectionRef.current = 'LEFT';
    if (dir === 'RIGHT' && directionRef.current !== 'LEFT') nextDirectionRef.current = 'RIGHT';
  };

  return (
    <div className="flex flex-col items-center justify-between min-h-screen bg-black font-sans select-none overflow-hidden touch-none p-4 w-full max-w-md mx-auto">
      
      <div className="w-full flex justify-between items-center py-4 px-2">
        <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(34,197,94,0.5)]">
                <svg className="w-6 h-6 text-black" fill="currentColor" viewBox="0 0 24 24"><path d="M7 7h10v2H7V7zm0 4h10v2H7v-2zm0 4h7v2H7v-2z" /><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z" /></svg>
            </div>
            <div>
                <h1 className="text-white font-black text-xl tracking-tighter uppercase">Snake Pro</h1>
                <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-[10px] text-green-500 font-bold tracking-widest uppercase">System Online</span>
                </div>
            </div>
        </div>
        <div className="text-right">
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">High Score</p>
            <p className="text-white font-black text-xl">{highScore}</p>
        </div>
      </div>

      <div className="relative w-full aspect-square bg-black rounded-[40px] border border-white/10 overflow-hidden shadow-2xl">
        <canvas ref={canvasRef} width={GAME_WIDTH} height={GAME_HEIGHT} className="w-full h-full object-contain" />
        <div className="absolute top-4 right-4 bg-white/10 backdrop-blur-md px-4 py-1 rounded-full border border-white/20">
            <span className="text-white font-bold text-sm">Score: {score}</span>
        </div>
        {isGameOver && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/90 backdrop-blur-xl z-30">
                <div className="text-center p-8">
                    <h2 className="text-4xl font-black text-white mb-2">GAME OVER</h2>
                    <p className="text-gray-400 font-bold mb-8">Score: {score}</p>
                    <button 
                        onClick={resetGame}
                        className="bg-green-500 text-black font-black py-4 px-12 rounded-2xl shadow-[0_8px_20px_rgba(34,197,94,0.4)] active:scale-95 transition-all"
                    >
                        PLAY AGAIN
                    </button>
                </div>
            </div>
        )}
      </div>

      <div className="w-full py-6 flex flex-col items-center gap-2">
          <ControlButton icon="UP" onClick={() => handleControl('UP')} />
          <div className="flex gap-10">
              <ControlButton icon="LEFT" onClick={() => handleControl('LEFT')} />
              <ControlButton icon="RIGHT" onClick={() => handleControl('RIGHT')} />
          </div>
          <ControlButton icon="DOWN" onClick={() => handleControl('DOWN')} />
      </div>

      <div className="w-full grid grid-cols-2 gap-3 mb-4">
          <button 
            onClick={() => setShowHelp(true)}
            className="flex items-center justify-center gap-2 bg-white/5 border border-white/10 py-3 rounded-2xl text-white font-bold text-xs uppercase tracking-widest active:bg-white/10"
          >
            How to APK?
          </button>
          <button 
            onClick={() => copyToClipboard(currentUrl)}
            className={`flex items-center justify-center gap-2 border py-3 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all ${copied ? 'bg-green-500 border-green-500 text-black' : 'bg-blue-600 border-blue-600 text-white'}`}
          >
            {copied ? 'Copied!' : 'Copy Link'}
          </button>
      </div>

      {showHelp && (
          <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-6">
              <div className="bg-[#1a1a1a] p-8 rounded-[32px] border border-white/10 w-full">
                  <h3 className="text-white text-2xl font-black mb-4 uppercase">APK Guide</h3>
                  <div className="space-y-4 text-gray-300 text-sm">
                      <p>১. গেমের লিঙ্কটি কপি করুন।</p>
                      <p>২. <a href="https://www.webintoapp.com" target="_blank" className="text-blue-400 underline">WebIntoApp.com</a> এ যান।</p>
                      <p>৩. লিঙ্কটি পেস্ট করে APK ডাউনলোড করুন।</p>
                      <div className="bg-black p-3 rounded-xl border border-white/5 break-all text-[10px] text-green-500 font-mono select-all">
                        {currentUrl}
                      </div>
                  </div>
                  <button onClick={() => setShowHelp(false)} className="w-full mt-8 bg-white text-black font-black py-4 rounded-2xl uppercase tracking-widest">Close</button>
              </div>
          </div>
      )}
    </div>
  );
};

const ControlButton = ({ icon, onClick }: { icon: string, onClick: () => void }) => (
    <button onPointerDown={onClick} className="w-16 h-16 bg-[#1a1a1a] border border-white/10 rounded-2xl flex items-center justify-center text-white active:bg-green-500 active:text-black active:scale-90 transition-all">
        <Arrow dir={icon as any} />
    </button>
);

const Arrow = ({ dir }: { dir: Direction }) => {
    const rotations = { UP: 'rotate-0', DOWN: 'rotate-180', LEFT: '-rotate-90', RIGHT: 'rotate-90' };
    return <svg className={`w-8 h-8 ${rotations[dir]}`} viewBox="0 0 24 24" fill="currentColor"><path d="M12 4l-8 10h16z" /></svg>;
