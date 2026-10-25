import React from 'react';

export interface BallNumberWordLogoProps {
  value: number | string; // '.', 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10 or 'W', 'C', 'B', 'LBW', 'R', 'WD', 'NB', etc.
  label?: string; // Optional custom text e.g. '.', 'C', 'B', 'LBW', 'R+1', '1lb', '1b', 'NB+1'
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | 'hero';
  className?: string;
  isWicket?: boolean;
  isExtra?: boolean;
  isFire?: boolean;
  colorScheme?: 'auto' | 'gold' | 'emerald' | 'indigo' | 'purple' | 'red' | 'amber' | 'dark' | 'light';
  animated?: boolean;
  isCircle?: boolean;
  displayMode?: 'digit' | 'word' | 'auto';
}

/**
 * Renders stylized vector word/digit logos for numbers (., 1, 2, 3, 4, 5, 6, etc.),
 * wicket notations (C, B, LBW, R, R+1, R+2... in Red), extras (1lb, 2lb..., 1b, 2b...),
 * and No Ball / Free Hit with Fire (NB, NB+1..., Free Hit).
 */
export const BallNumberWordLogo: React.FC<BallNumberWordLogoProps> = ({
  value,
  label,
  size = 'md',
  className = '',
  isWicket = false,
  isExtra = false,
  isFire = false,
  colorScheme = 'auto',
  animated = false,
  isCircle = false,
  displayMode = 'auto',
}) => {
  // Normalize key string
  const valKey = String(value ?? '').trim();
  const rawLabel = label !== undefined && label !== null ? String(label).trim() : '';
  const effectiveToken = (rawLabel || valKey).trim();
  const numVal = typeof value === 'number' ? value : (/^\d+$/.test(valKey) ? parseInt(valKey, 10) : NaN);

  // Detect wicket notation: C, B, LBW, R, R+1, R+2..., W, W+1..., Caught, Bowled, Run Out, etc.
  // Note: 1b, 2b, 3b (byes) start with a digit so they are NOT matched as 'B' (Bowled).
  if (
    /^(?:W|C|B|LBW|R|ST|HW)(?:\+\d+)?$/i.test(effectiveToken) ||
    /^(?:caught|bowled|lbw|leg\s*bye\s*wicket|run\s*out|stumped|hit\s*wicket|wicket|wickets|out)(?:\s*\+\s*\d+)?$/i.test(effectiveToken) ||
    (valKey.toLowerCase().includes('w') && !valKey.toLowerCase().includes('wd') && (isNaN(numVal) || numVal === 0))
  ) {
    isWicket = true;
  }

  // Detect No Ball (NB, NB+1...) or Free Hit -> Fire
  if (
    /^nb(?:\+\d+)?$/i.test(effectiveToken) ||
    /^(?:no\s*ball|free\s*hit|fh)(?:\s*\+\s*\d+)?$/i.test(effectiveToken) ||
    effectiveToken.includes('🔥')
  ) {
    isFire = true;
  }

  // Detect Leg Bye (1lb, 2lb...) or Bye (1b, 2b...) or Wide (WD, WD+1...) as extra
  if (/^\d+(?:lb|b)$/i.test(effectiveToken) || /^wd(?:\+\d+)?$/i.test(effectiveToken)) {
    isExtra = true;
  }

  // Derive color scheme if auto
  let bgClass = 'bg-slate-900 text-white';
  let borderClass = 'border-slate-800';

  if (colorScheme === 'auto') {
    if (isWicket) {
      bgClass = 'bg-gradient-to-br from-red-600 to-red-800 text-white shadow-red-500/40';
      borderClass = 'border-red-500';
    } else if (isFire) {
      bgClass = 'bg-gradient-to-br from-orange-500 via-red-600 to-amber-600 text-white shadow-orange-500/40';
      borderClass = 'border-orange-400';
    } else if (numVal >= 6) {
      bgClass = 'bg-gradient-to-br from-purple-600 to-indigo-800 text-white shadow-purple-500/30';
      borderClass = 'border-purple-400';
    } else if (numVal === 4) {
      bgClass = 'bg-gradient-to-br from-emerald-600 to-teal-800 text-white shadow-emerald-500/30';
      borderClass = 'border-emerald-400';
    } else if (isExtra) {
      bgClass = 'bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-amber-500/30';
      borderClass = 'border-amber-400';
    } else if (numVal === 0 || valKey === '0' || valKey === '.' || valKey.toLowerCase() === 'dot' || rawLabel === '.') {
      bgClass = 'bg-gradient-to-br from-slate-800 to-slate-950 text-slate-200 border-slate-700';
      borderClass = 'border-slate-600';
    } else {
      bgClass = 'bg-gradient-to-br from-indigo-600 to-slate-900 text-white shadow-indigo-500/25';
      borderClass = 'border-indigo-500';
    }
  } else if (colorScheme === 'gold') {
    bgClass = 'bg-gradient-to-br from-yellow-400 via-amber-500 to-yellow-600 text-slate-950 shadow-amber-500/30';
    borderClass = 'border-yellow-300';
  } else if (colorScheme === 'red') {
    bgClass = 'bg-gradient-to-br from-red-600 to-red-800 text-white shadow-red-500/30';
    borderClass = 'border-red-500';
  }

  // Size mapping
  const sizeMap = {
    xs: 'h-5 px-1.5 text-[9px]',
    sm: 'h-7 px-2.5 text-xs',
    md: 'h-9 px-3.5 text-sm',
    lg: 'h-12 px-5 text-base',
    xl: 'h-16 px-6 text-xl',
    '2xl': 'h-20 px-8 text-2xl',
    '3xl': 'h-24 px-10 text-3xl',
    hero: 'h-32 px-12 text-5xl',
  };

  const svgSizeMap = {
    xs: { width: 48, height: 18 },
    sm: { width: 68, height: 24 },
    md: { width: 92, height: 32 },
    lg: { width: 120, height: 42 },
    xl: { width: 160, height: 56 },
    '2xl': { width: 200, height: 70 },
    '3xl': { width: 240, height: 84 },
    hero: { width: 320, height: 110 },
  };

  // Determine effective display string/word
  let word = '';
  if (displayMode === 'digit') {
    if (rawLabel !== '') {
      word = rawLabel;
    } else if (valKey === '0' || numVal === 0 || valKey === '.' || valKey.toLowerCase() === 'dot') {
      word = '.';
    } else if (!isNaN(numVal)) {
      word = numVal.toString();
    } else {
      word = valKey;
    }
  } else if (displayMode === 'word') {
    if (rawLabel) {
      word = rawLabel;
    } else if (isWicket) {
      word = valKey ? valKey.toUpperCase() : 'W';
    } else if (valKey === '0' || numVal === 0 || valKey === '.' || valKey.toLowerCase() === 'dot') {
      word = '.';
    } else if (numVal === 1 || valKey === '1') {
      word = '1';
    } else if (numVal === 2 || valKey === '2') {
      word = '2';
    } else if (numVal === 3 || valKey === '3') {
      word = '3';
    } else if (numVal === 4 || valKey === '4') {
      word = '4';
    } else if (numVal === 5 || valKey === '5') {
      word = '5';
    } else if (numVal === 6 || valKey === '6') {
      word = '6';
    } else if (numVal === 7 || valKey === '7') {
      word = '7';
    } else if (numVal === 8 || valKey === '8') {
      word = '8';
    } else if (numVal === 9 || valKey === '9') {
      word = '9';
    } else if (numVal === 10 || valKey === '10') {
      word = '10';
    } else {
      word = valKey;
    }
  } else {
    // auto mode: use concise cricket notation (., 1, 2, 3, 4, 5, 6, C, B, LBW, R+1, 1lb, 1b, NB, NB+1...)
    if (rawLabel !== '') {
      word = rawLabel;
    } else if (valKey === '0' || numVal === 0 || valKey === '.' || valKey.toLowerCase() === 'dot') {
      word = '.';
    } else if (!isNaN(numVal)) {
      word = numVal.toString();
    } else if (isWicket) {
      word = valKey || 'W';
    } else {
      word = valKey;
    }
  }

  // Add fire emoji if isFire and not already containing fire emoji
  const displayWord = isFire && !word.includes('🔥') ? `${word}🔥` : word;

  const baseSvgSize = svgSizeMap[size] || svgSizeMap.md;
  let computedWidth = baseSvgSize.width;
  const upperWord = word.trim().toUpperCase();

  if (displayWord.length > 5 && !isCircle) {
    computedWidth = Math.max(baseSvgSize.width, 70 + displayWord.length * 10);
  }

  const textColor = colorScheme === 'gold' ? '#0f172a' : '#ffffff';

  // Render vector SVG for word/digit logo
  const renderWordLogoSVG = () => {
    if (isCircle) {
      if (word === 'DOT' || word === '0' || word === '.') {
        return (
          <svg viewBox="0 0 100 100" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
            <circle cx="50" cy="50" r="12" fill="#f59e0b" />
          </svg>
        );
      }
      return (
        <svg viewBox="0 0 100 100" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
          <text
            x="50"
            y="60"
            textAnchor="middle"
            fill="#ffffff"
            fontFamily="system-ui, -apple-system, sans-serif"
            fontWeight="900"
            fontSize={displayWord.length > 5 ? '18' : displayWord.length > 3 ? '24' : '36'}
            letterSpacing="0.5"
          >
            {displayWord}
          </text>
        </svg>
      );
    }

    if (word === '.' || upperWord === 'DOT' || word === '0') {
      return (
        <svg viewBox="0 0 100 50" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
          <circle cx="50" cy="25" r="9" fill="#f59e0b" />
        </svg>
      );
    }

    // Concise notation rendering (e.g. "1", "2", "3", "4", "5", "6", "C", "B", "LBW", "R", "R+1", "1lb", "2lb", "1b", "2b", "NB🔥", "NB+1🔥", "WD", etc.)
    if (
      displayMode === 'digit' ||
      isFire ||
      /^(?:[0-9]+|[0-9]+(?:lb|b)|(?:C|B|LBW|R|W|ST|HW)(?:\+\d+)?|WD(?:\+\d+)?|NB(?:\+\d+)?)$/i.test(word)
    ) {
      if (/^[0-9]+$/.test(word) || /^(?:C|B|R|W)$/i.test(word)) {
        return (
          <svg viewBox="0 0 100 50" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
            <text 
              x="50" 
              y="37" 
              textAnchor="middle" 
              fill={textColor} 
              fontFamily="system-ui, -apple-system, sans-serif" 
              fontWeight="900" 
              fontSize={displayWord.length === 1 ? '36' : '30'} 
              letterSpacing="0"
            >
              {displayWord}
            </text>
          </svg>
        );
      }
      return (
        <svg viewBox="0 0 130 50" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
          <text 
            x="65" 
            y="35" 
            textAnchor="middle" 
            fill={textColor} 
            fontFamily="system-ui, -apple-system, sans-serif" 
            fontWeight="900" 
            fontSize={displayWord.length > 5 ? '20' : displayWord.length > 3 ? '24' : '28'} 
            letterSpacing="0"
          >
            {displayWord}
          </text>
        </svg>
      );
    }

    // Crisp, perfectly centered typography for standard ball words
    const standardWords = ['DOT', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'TEN'];
    if (standardWords.includes(upperWord)) {
      return (
        <svg viewBox="0 0 120 50" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
          <text 
            x="60" 
            y="35" 
            textAnchor="middle" 
            fill={textColor} 
            fontFamily="system-ui, -apple-system, sans-serif" 
            fontWeight="900" 
            fontSize={upperWord.length > 4 ? "22" : "26"} 
            letterSpacing="1.2"
          >
            {upperWord}
          </text>
        </svg>
      );
    }

    if (upperWord === 'SEVEN') {
      return (
        <svg viewBox="0 0 160 50" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
          <defs>
            <linearGradient id="grad-seven" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={colorScheme === 'gold' ? '#0f172a' : '#ffffff'} />
              <stop offset="100%" stopColor={colorScheme === 'gold' ? '#1e293b' : '#fef08a'} />
            </linearGradient>
          </defs>
          <g transform="translate(5, 5)">
            <path d="M 20 8 L 7 8 L 7 18 L 20 19 L 20 32 L 6 32 L 6 26 L 13 26 L 13 24 L 7 23 L 7 8 Z M 13 13 L 13 13 L 20 13 Z" fill="url(#grad-seven)" />
            <path d="M 24 8 L 38 8 L 38 13 L 30 13 L 30 17 L 37 17 L 37 22 L 30 22 L 30 27 L 39 27 L 39 32 L 24 32 Z" fill="url(#grad-seven)" />
            <path d="M 42 8 L 49 8 L 54 24 L 59 8 L 66 8 L 58 32 L 50 32 Z" fill="url(#grad-seven)" />
            <path d="M 69 8 L 83 8 L 83 13 L 75 13 L 75 17 L 82 17 L 82 22 L 75 22 L 75 27 L 84 27 L 84 32 L 69 32 Z" fill="url(#grad-seven)" />
            <path d="M 87 8 L 94 8 L 102 24 L 102 8 L 108 8 L 108 32 L 101 32 L 93 16 L 93 32 L 87 32 Z" fill="url(#grad-seven)" />
          </g>
        </svg>
      );
    }

    if (upperWord === 'EIGHT') {
      return (
        <svg viewBox="0 0 150 50" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
          <defs>
            <linearGradient id="grad-eight" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={colorScheme === 'gold' ? '#0f172a' : '#ffffff'} />
              <stop offset="100%" stopColor={colorScheme === 'gold' ? '#1e293b' : '#fed7aa'} />
            </linearGradient>
          </defs>
          <g transform="translate(5, 5)">
            <path d="M 18 24 C 18 15, 6 15, 6 24 C 6 34, 19 34, 19 28 L 13 28 C 13 30, 11 30, 9 29 C 8 28, 8 25, 14 25 L 18 25 Z M 12 21 C 10 21, 9 22, 9 23 L 15 23 C 15 22, 13 21, 12 21 Z" fill="url(#grad-eight)" />
            <path d="M 22 18 L 27 18 L 27 33 L 22 33 Z M 22 12 L 27 12 L 27 15 L 22 15 Z" fill="url(#grad-eight)" />
            <path d="M 30 18 L 36 18 L 36 21 C 38 17, 44 17, 44 23 C 44 29, 36 28, 36 33 C 36 38, 29 37, 29 33 Z M 36 24 C 36 22, 39 22, 39 24 C 39 26, 36 26, 36 24 Z" fill="url(#grad-eight)" />
            <path d="M 47 10 L 52 10 L 52 19 C 55 17, 60 17, 60 22 L 60 33 L 55 33 L 55 23 C 55 21, 52 21, 52 23 L 52 33 L 47 33 Z" fill="url(#grad-eight)" />
            <path d="M 64 13 L 69 13 L 69 17 L 74 17 L 74 21 L 69 21 L 69 29 C 69 31, 71 31, 73 30 L 73 34 C 68 35, 64 33, 64 28 L 64 21 L 61 21 L 61 17 L 64 17 Z" fill="url(#grad-eight)" />
          </g>
        </svg>
      );
    }

    if (upperWord === 'NINE') {
      return (
        <svg viewBox="0 0 140 50" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
          <defs>
            <linearGradient id="grad-nine" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={colorScheme === 'gold' ? '#0f172a' : '#ffffff'} />
              <stop offset="100%" stopColor={colorScheme === 'gold' ? '#1e293b' : '#ddd6fe'} />
            </linearGradient>
          </defs>
          <g transform="translate(5, 5)">
            <path d="M 8 8 L 15 8 L 24 24 L 24 8 L 30 8 L 30 32 L 23 32 L 14 16 L 14 32 L 8 32 Z" fill="url(#grad-nine)" />
            <path d="M 34 8 L 41 8 L 41 32 L 34 32 Z" fill="url(#grad-nine)" />
            <circle cx="37.5" cy="14" r="3.5" fill="#a855f7" />
            <path d="M 45 8 L 52 8 L 61 24 L 61 8 L 67 8 L 67 32 L 60 32 L 51 16 L 51 32 L 45 32 Z" fill="url(#grad-nine)" />
            <path d="M 71 8 L 86 8 L 86 13 L 78 13 L 78 17 L 85 17 L 85 22 L 78 22 L 78 27 L 87 27 L 87 32 L 71 32 Z" fill="url(#grad-nine)" />
          </g>
        </svg>
      );
    }

    if (upperWord === 'TEN') {
      return (
        <svg viewBox="0 0 130 50" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
          <defs>
            <linearGradient id="grad-ten" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={colorScheme === 'gold' ? '#0f172a' : '#ffffff'} />
              <stop offset="100%" stopColor={colorScheme === 'gold' ? '#1e293b' : '#93c5fd'} />
            </linearGradient>
          </defs>
          <g transform="translate(5, 5)">
            <path d="M 8 8 L 30 8 L 30 14 L 22 14 L 22 32 L 16 32 L 16 14 L 8 14 Z" fill="url(#grad-ten)" />
            <path d="M 33 8 L 51 8 L 51 13 L 40 13 L 40 17 L 49 17 L 49 22 L 40 22 L 40 27 L 52 27 L 52 32 L 33 32 Z" fill="url(#grad-ten)" />
            <path d="M 55 8 L 62 8 L 71 24 L 71 8 L 77 8 L 77 32 L 70 32 L 61 16 L 61 32 L 55 32 Z" fill="url(#grad-ten)" />
          </g>
        </svg>
      );
    }

    if (upperWord === 'DOT' || upperWord === '0') {
      return (
        <svg viewBox="0 0 130 50" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
          <defs>
            <linearGradient id="grad-dot" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={colorScheme === 'gold' ? '#0f172a' : '#f8fafc'} />
              <stop offset="100%" stopColor={colorScheme === 'gold' ? '#334155' : '#94a3b8'} />
            </linearGradient>
          </defs>
          <g transform="translate(5, 5)">
            <circle cx="20" cy="20" r="10" fill="#f59e0b" />
            <text x="40" y="27" fill="url(#grad-dot)" fontFamily="system-ui, -apple-system, sans-serif" fontWeight="900" fontSize="24" letterSpacing="1">DOT</text>
          </g>
        </svg>
      );
    }

    // WICKET Methods - Vector Typographic Logos
    if (upperWord === 'BOWLED' || upperWord === 'বোল্ড') {
      return (
        <svg viewBox="0 0 160 50" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
          <defs>
            <linearGradient id="grad-bowled" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={colorScheme === 'gold' ? '#0f172a' : '#ffffff'} />
              <stop offset="100%" stopColor={colorScheme === 'gold' ? '#1e293b' : '#fef08a'} />
            </linearGradient>
          </defs>
          <g transform="translate(0, 0)">
            <text x="80" y="33" textAnchor="middle" fill="url(#grad-bowled)" fontFamily="system-ui, -apple-system, sans-serif" fontWeight="900" fontSize="22" letterSpacing="1.5">
              {upperWord === 'বোল্ড' ? 'বোল্ড' : 'BOWLED'}
            </text>
          </g>
        </svg>
      );
    }

    if (upperWord === 'CAUGHT' || upperWord === 'ক্যাচ' || upperWord === 'CATCH') {
      return (
        <svg viewBox="0 0 160 50" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
          <defs>
            <linearGradient id="grad-caught" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={colorScheme === 'gold' ? '#0f172a' : '#ffffff'} />
              <stop offset="100%" stopColor={colorScheme === 'gold' ? '#1e293b' : '#fed7aa'} />
            </linearGradient>
          </defs>
          <g transform="translate(0, 0)">
            <text x="80" y="33" textAnchor="middle" fill="url(#grad-caught)" fontFamily="system-ui, -apple-system, sans-serif" fontWeight="900" fontSize="22" letterSpacing="1.5">
              {upperWord === 'ক্যাচ' ? 'ক্যাচ' : 'CAUGHT'}
            </text>
          </g>
        </svg>
      );
    }

    if (upperWord === 'RUN OUT' || upperWord === 'RUNOUT' || upperWord === 'রান আউট') {
      return (
        <svg viewBox="0 0 170 50" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
          <defs>
            <linearGradient id="grad-runout" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={colorScheme === 'gold' ? '#0f172a' : '#ffffff'} />
              <stop offset="100%" stopColor={colorScheme === 'gold' ? '#1e293b' : '#fca5a5'} />
            </linearGradient>
          </defs>
          <g transform="translate(0, 0)">
            <text x="85" y="33" textAnchor="middle" fill="url(#grad-runout)" fontFamily="system-ui, -apple-system, sans-serif" fontWeight="900" fontSize="21" letterSpacing="1.5">
              {upperWord === 'রান আউট' ? 'রান আউট' : 'RUN OUT'}
            </text>
          </g>
        </svg>
      );
    }

    if (upperWord === 'LBW' || upperWord === 'এলবিডব্লিউ') {
      return (
        <svg viewBox="0 0 130 50" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
          <defs>
            <linearGradient id="grad-lbw" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={colorScheme === 'gold' ? '#0f172a' : '#ffffff'} />
              <stop offset="100%" stopColor={colorScheme === 'gold' ? '#1e293b' : '#fde047'} />
            </linearGradient>
          </defs>
          <g transform="translate(0, 0)">
            <text x="65" y="34" textAnchor="middle" fill="url(#grad-lbw)" fontFamily="system-ui, -apple-system, sans-serif" fontWeight="900" fontSize="24" letterSpacing="2">
              {upperWord === 'এলবিডব্লিউ' ? 'এলবিডব্লিউ' : 'LBW'}
            </text>
          </g>
        </svg>
      );
    }

    if (upperWord === 'STUMPED' || upperWord === 'স্টাম্পড') {
      return (
        <svg viewBox="0 0 170 50" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
          <defs>
            <linearGradient id="grad-stumped" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={colorScheme === 'gold' ? '#0f172a' : '#ffffff'} />
              <stop offset="100%" stopColor={colorScheme === 'gold' ? '#1e293b' : '#cbd5e1'} />
            </linearGradient>
          </defs>
          <g transform="translate(0, 0)">
            <text x="85" y="33" textAnchor="middle" fill="url(#grad-stumped)" fontFamily="system-ui, -apple-system, sans-serif" fontWeight="900" fontSize="21" letterSpacing="1.5">
              {upperWord === 'স্টাম্পড' ? 'স্টাম্পড' : 'STUMPED'}
            </text>
          </g>
        </svg>
      );
    }

    if (upperWord === 'HIT WICKET' || upperWord === 'HITWICKET' || upperWord === 'হিট উইকেট') {
      return (
        <svg viewBox="0 0 190 50" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
          <defs>
            <linearGradient id="grad-hitw" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={colorScheme === 'gold' ? '#0f172a' : '#ffffff'} />
              <stop offset="100%" stopColor={colorScheme === 'gold' ? '#1e293b' : '#fca5a5'} />
            </linearGradient>
          </defs>
          <g transform="translate(0, 0)">
            <text x="95" y="33" textAnchor="middle" fill="url(#grad-hitw)" fontFamily="system-ui, -apple-system, sans-serif" fontWeight="900" fontSize="20" letterSpacing="1">
              {upperWord === 'হিট উইকেট' ? 'হিট উইকেট' : 'HIT WICKET'}
            </text>
          </g>
        </svg>
      );
    }

    if (upperWord === 'CAUGHT & BOWLED' || upperWord === 'CAUGHT AND BOWLED' || upperWord === 'ক্যাচ এবং বোল্ড') {
      return (
        <svg viewBox="0 0 210 50" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
          <defs>
            <linearGradient id="grad-cb" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={colorScheme === 'gold' ? '#0f172a' : '#ffffff'} />
              <stop offset="100%" stopColor={colorScheme === 'gold' ? '#1e293b' : '#fef08a'} />
            </linearGradient>
          </defs>
          <g transform="translate(0, 0)">
            <text x="105" y="32" textAnchor="middle" fill="url(#grad-cb)" fontFamily="system-ui, -apple-system, sans-serif" fontWeight="900" fontSize="17" letterSpacing="1">
              {upperWord === 'ক্যাচ এবং বোল্ড' ? 'ক্যাচ এবং বোল্ড' : 'CAUGHT & BOWLED'}
            </text>
          </g>
        </svg>
      );
    }

    if (upperWord === 'WICKET' || upperWord === 'OUT' || upperWord === 'উইকেট') {
      return (
        <svg viewBox="0 0 160 50" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
          <defs>
            <linearGradient id="grad-wkt" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={colorScheme === 'gold' ? '#0f172a' : '#ffffff'} />
              <stop offset="100%" stopColor={colorScheme === 'gold' ? '#1e293b' : '#fca5a5'} />
            </linearGradient>
          </defs>
          <g transform="translate(0, 0)">
            <text x="80" y="33" textAnchor="middle" fill="url(#grad-wkt)" fontFamily="system-ui, -apple-system, sans-serif" fontWeight="900" fontSize="23" letterSpacing="2">
              {upperWord === 'উইকেট' ? 'উইকেট' : 'WICKET'}
            </text>
          </g>
        </svg>
      );
    }

    // Default Fallback Text Logo for other Wicket types or other custom strings
    const viewBoxWidth = Math.max(160, 40 + word.length * 16);
    return (
      <svg viewBox={`0 0 ${viewBoxWidth} 50`} width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
        <text 
          x={viewBoxWidth / 2} 
          y="32" 
          textAnchor="middle" 
          fill={textColor} 
          fontFamily="system-ui, -apple-system, sans-serif" 
          fontWeight="900" 
          fontSize={word.length > 12 ? '17' : word.length > 8 ? '20' : '22'} 
          letterSpacing="1"
        >
          {word}
        </text>
      </svg>
    );
  };

  if (isCircle) {
    return (
      <div
        className={`w-full h-full rounded-full aspect-square flex items-center justify-center border-2 font-black shadow-md select-none transition-all duration-300 ${bgClass} ${borderClass} ${
          animated ? 'animate-bounce' : ''
        } ${className}`}
      >
        <div className="w-full h-full flex items-center justify-center p-1">
          {renderWordLogoSVG()}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`inline-flex items-center justify-center rounded-xl border font-black shadow-md select-none transition-all duration-300 ${bgClass} ${borderClass} ${sizeMap[size]} ${
        animated ? 'animate-bounce' : ''
      } ${className}`}
      style={{
        minWidth: computedWidth,
      }}
    >
      <div className="w-full h-full flex items-center justify-center p-0.5">
        {renderWordLogoSVG()}
      </div>
    </div>
  );
};

export default BallNumberWordLogo;
