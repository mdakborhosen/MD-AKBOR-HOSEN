import express from "express";
import http from "http";
import https from "https";
import path from "path";
import dotenv from "dotenv";
import fs from "fs";
import { fileURLToPath } from "url";
import { execSync } from "child_process";
import axios from "axios";
import * as cheerio from "cheerio";
import { GoogleGenAI, Type, type FunctionDeclaration } from "@google/genai";
import { INITIAL_SPORTS_NEWS, type SportsNewsArticle } from "./data/sportsNewsData.ts";

dotenv.config();

// Persistent HTTP/HTTPS Keep-Alive connection pooling to eliminate TCP/TLS handshake latency on live polling
axios.defaults.httpAgent = new http.Agent({ keepAlive: true, maxSockets: 100, keepAliveMsecs: 30000 });
axios.defaults.httpsAgent = new https.Agent({ keepAlive: true, maxSockets: 100, keepAliveMsecs: 30000 });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let serverInstance: any = null;

process.on("uncaughtException", (err) => {
  console.error("[Uncaught Exception]", err);
});
process.on("unhandledRejection", (reason) => {
  console.error("[Unhandled Rejection]", reason);
});
process.on("SIGTERM", () => {
  console.log("[Server] SIGTERM received, shutting down immediately...");
  try {
    serverInstance?.closeAllConnections?.();
    serverInstance?.close();
  } catch {}
  process.exit(0);
});
process.on("SIGINT", () => {
  console.log("[Server] SIGINT received, shutting down immediately...");
  try {
    serverInstance?.closeAllConnections?.();
    serverInstance?.close();
  } catch {}
  process.exit(0);
});

// Ensure data directory exists for cloud backup (fallback to /tmp if container root is read-only)
let DATA_DIR = path.join(process.cwd(), "data");
try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
} catch {
  DATA_DIR = "/tmp";
}
const BACKUP_FILE = path.join(DATA_DIR, "cricket_backup.json");

// In-memory demo match simulators for interactive testing
const demoMatches: Record<string, any> = {
  "demo://t20-live": {
    team1: "BAN",
    team2: "IND",
    battingTeam: "BAN",
    bowlingTeam: "IND",
    score: 148,
    wickets: 3,
    overs: 16,
    ballsInOver: 2,
    target: 182,
    firstInningsScore: "181/6",
    maxOvers: 20,
    statusText: "BAN need 34 runs in 22 balls",
    lastBallSymbol: "6",
    recentBalls: ["1", "4", "•", "2", "1", "6"],
    batsmen: [
      { name: "Shakib Al Hasan", runs: 42, balls: 28, fours: 4, sixes: 1 },
      { name: "Towhid Hridoy", runs: 29, balls: 19, fours: 3, sixes: 1 }
    ],
    bowler: { name: "Jasprit Bumrah", overs: "3.2", runs: 24, wickets: 2 }
  },
  "demo://he-vs-ddw": {
    team1: "HE",
    team2: "DDW",
    battingTeam: "DDW",
    bowlingTeam: "HE",
    score: 159,
    wickets: 2,
    overs: 16,
    ballsInOver: 0,
    target: 198,
    firstInningsScore: "197",
    firstInningsTotalScore: 198,
    firstInningsOverScores: {
      "2.2": "25/0",
      "3.3": "24/0",
      "16": "123/7",
      "16.0": "123/7",
      "18": "141/8",
      "18.0": "141/8"
    },
    secondInningsOverScores: {
      "2.2": "13/0",
      "3.3": "27/1",
      "16": "159/2",
      "16.0": "159/2"
    },
    team1Score: "123/7",
    team2Score: "159/2",
    maxOvers: 20,
    statusText: "DDW need 39 runs in 24 balls",
    lastBallSymbol: "1",
    recentBalls: ["1", "4", "1", "2", "6", "1"],
    batsmen: [
      { name: "DDW Batter 1", runs: 72, balls: 44, fours: 6, sixes: 3 },
      { name: "DDW Batter 2", runs: 45, balls: 28, fours: 4, sixes: 1 }
    ],
    bowler: { name: "HE Bowler 1", overs: "3.0", runs: 28, wickets: 1 }
  },
  "demo://ban-vs-ind": {
    team1: "BAN",
    team2: "IND",
    battingTeam: "BAN",
    bowlingTeam: "IND",
    score: 148,
    wickets: 3,
    overs: 16,
    ballsInOver: 2,
    target: 182,
    firstInningsScore: "181/6",
    maxOvers: 20,
    statusText: "BAN need 34 runs in 22 balls",
    lastBallSymbol: "6",
    recentBalls: ["1", "4", "•", "2", "1", "6"],
    batsmen: [
      { name: "Shakib Al Hasan", runs: 42, balls: 28, fours: 4, sixes: 1 },
      { name: "Towhid Hridoy", runs: 29, balls: 19, fours: 3, sixes: 1 }
    ],
    bowler: { name: "Jasprit Bumrah", overs: "3.2", runs: 24, wickets: 2 }
  },
  "demo://ind-vs-pak": {
    team1: "IND",
    team2: "PAK",
    battingTeam: "IND",
    bowlingTeam: "PAK",
    score: 165,
    wickets: 4,
    overs: 18,
    ballsInOver: 1,
    target: 178,
    maxOvers: 20,
    statusText: "IND need 13 runs in 11 balls",
    lastBallSymbol: "6",
    recentBalls: ["4", "1", "W", "2", "•", "6"],
    batsmen: [
      { name: "Virat Kohli", runs: 68, balls: 46, fours: 6, sixes: 2 },
      { name: "Hardik Pandya", runs: 18, balls: 11, fours: 1, sixes: 1 }
    ],
    bowler: { name: "Shaheen Afridi", overs: "3.1", runs: 32, wickets: 2 }
  },
  "demo://cricbuzz-india-pak": {
    team1: "IND",
    team2: "PAK",
    battingTeam: "IND",
    bowlingTeam: "PAK",
    score: 165,
    wickets: 4,
    overs: 18,
    ballsInOver: 1,
    target: 178,
    maxOvers: 20,
    statusText: "IND need 13 runs in 11 balls",
    recentBalls: ["4", "1", "W", "2", "•", "6"],
    batsmen: [
      { name: "Virat Kohli", runs: 68, balls: 46, fours: 6, sixes: 2 },
      { name: "Hardik Pandya", runs: 18, balls: 11, fours: 1, sixes: 1 }
    ],
    bowler: { name: "Shaheen Afridi", overs: "3.1", runs: 32, wickets: 2 }
  },
  "demo://bpl-final": {
    team1: "Fortune Barishal",
    team2: "Comilla Victorians",
    battingTeam: "Fortune Barishal",
    bowlingTeam: "Comilla Victorians",
    score: 112,
    wickets: 2,
    overs: 12,
    ballsInOver: 4,
    target: 168,
    maxOvers: 20,
    statusText: "Fortune Barishal need 56 runs in 44 balls",
    recentBalls: ["1", "•", "4", "1", "1", "2"],
    batsmen: [
      { name: "Tamim Iqbal", runs: 54, balls: 38, fours: 6, sixes: 2 },
      { name: "Mushfiqur Rahim", runs: 22, balls: 16, fours: 2, sixes: 0 }
    ],
    bowler: { name: "Mustafizur Rahman", overs: "2.4", runs: 18, wickets: 1 }
  },
  "demo://upcoming": {
    team1: "ভারত",
    team2: "বাংলাদেশ",
    battingTeam: "ভারত",
    bowlingTeam: "বাংলাদেশ",
    score: 0,
    wickets: 0,
    overs: 0,
    ballsInOver: 0,
    target: 0,
    maxOvers: 20,
    isUpcoming: true,
    matchStartTime: "আজ সন্ধ্যা ৭:৩০ মি. (07:30 PM)",
    matchStartTimeIso: new Date(Date.now() + 3600000 * 2.5).toISOString(),
    statusText: "ম্যাচ এখনও শুরু হয়নি • শুরু হবে সন্ধ্যা ৭:৩০ মি.",
    recentBalls: [],
    batsmen: [],
    bowler: null
  },
  "demo://not-started": {
    team1: "Australia",
    team2: "England",
    battingTeam: "Australia",
    bowlingTeam: "England",
    score: 0,
    wickets: 0,
    overs: 0,
    ballsInOver: 0,
    target: 0,
    maxOvers: 20,
    isUpcoming: true,
    matchStartTime: "Today, 8:00 PM (14:30 GMT)",
    matchStartTimeIso: new Date(Date.now() + 3600000 * 3).toISOString(),
    statusText: "Match yet to begin • Starts at 8:00 PM",
    recentBalls: [],
    batsmen: [],
    bowler: null
  },
  "sofascore://croatia-vs-england": {
    sport: "football",
    team1: "Croatia",
    team2: "England",
    footballScore1: 1,
    footballScore2: 2,
    footballMinute: "68'",
    footballPeriod: "2H",
    footballGoals: [
      { minute: "19'", player: "H. Kane", team: "team2" },
      { minute: "42'", player: "A. Kramarić", team: "team1" },
      { minute: "61'", player: "J. Bellingham", team: "team2" }
    ],
    footballCards: [
      { minute: "35'", player: "M. Kovačić", team: "team1", type: "yellow" }
    ],
    footballStats: {
      possession: [46, 54],
      shots: [11, 15],
      shotsOnTarget: [4, 7],
      corners: [4, 6],
      fouls: [10, 8],
      yellowCards: [1, 0],
      redCards: [0, 0],
      offsides: [1, 2]
    },
    isUpcoming: false,
    statusText: "2nd Half • 68' (Croatia 1 - 2 England)",
    footballVenue: "Stadion Maksimir"
  },
  "sofascore://real-madrid-vs-barcelona": {
    sport: "football",
    team1: "Real Madrid",
    team2: "Barcelona",
    footballScore1: 2,
    footballScore2: 1,
    footballMinute: "74'",
    footballPeriod: "2H",
    footballGoals: [
      { minute: "22'", player: "Vinícius Jr.", team: "team1" },
      { minute: "54'", player: "R. Lewandowski", team: "team2" },
      { minute: "71'", player: "J. Bellingham", team: "team1", isPenalty: true }
    ],
    footballCards: [
      { minute: "38'", player: "Gavi", team: "team2", type: "yellow" },
      { minute: "65'", player: "E. Camavinga", team: "team1", type: "yellow" }
    ],
    footballStats: {
      possession: [53, 47],
      shots: [15, 12],
      shotsOnTarget: [6, 4],
      corners: [6, 4],
      fouls: [11, 14],
      yellowCards: [1, 1],
      redCards: [0, 0],
      offsides: [2, 1]
    },
    statusText: "2nd Half • 74'",
    footballVenue: "Santiago Bernabéu",
    footballReferee: "César Soto Grado"
  },
  "sofascore://arsenal-vs-chelsea": {
    sport: "football",
    team1: "Arsenal",
    team2: "Chelsea",
    footballScore1: 3,
    footballScore2: 1,
    footballMinute: "82'",
    footballPeriod: "2H",
    footballGoals: [
      { minute: "18'", player: "B. Saka", team: "team1" },
      { minute: "34'", player: "K. Havertz", team: "team1" },
      { minute: "62'", player: "C. Palmer", team: "team2" },
      { minute: "81'", player: "D. Rice", team: "team1" }
    ],
    footballCards: [
      { minute: "29'", player: "M. Caicedo", team: "team2", type: "yellow" },
      { minute: "73'", player: "N. Jackson", team: "team2", type: "yellow" }
    ],
    footballStats: {
      possession: [58, 42],
      shots: [18, 9],
      shotsOnTarget: [8, 3],
      corners: [8, 3],
      fouls: [9, 13],
      yellowCards: [0, 2],
      redCards: [0, 0],
      offsides: [3, 2]
    },
    statusText: "2nd Half • 82'",
    footballVenue: "Emirates Stadium"
  },
  "sofascore://man-city-vs-liverpool": {
    sport: "football",
    team1: "Manchester City",
    team2: "Liverpool",
    footballScore1: 2,
    footballScore2: 2,
    footballMinute: "86'",
    footballPeriod: "2H",
    footballGoals: [
      { minute: "27'", player: "E. Haaland", team: "team1" },
      { minute: "41'", player: "M. Salah", team: "team2" },
      { minute: "69'", player: "P. Foden", team: "team1" },
      { minute: "86'", player: "L. Díaz", team: "team2" }
    ],
    footballCards: [
      { minute: "44'", player: "Rodri", team: "team1", type: "yellow" },
      { minute: "58'", player: "V. van Dijk", team: "team2", type: "yellow" }
    ],
    footballStats: {
      possession: [55, 45],
      shots: [16, 15],
      shotsOnTarget: [6, 5],
      corners: [7, 5],
      fouls: [10, 11],
      yellowCards: [1, 1],
      redCards: [0, 0],
      offsides: [1, 3]
    },
    statusText: "2nd Half • 86'",
    footballVenue: "Etihad Stadium"
  },
  "demo://football-live": {
    sport: "football",
    team1: "Real Madrid",
    team2: "Barcelona",
    footballScore1: 2,
    footballScore2: 1,
    footballMinute: "74'",
    footballPeriod: "2H",
    footballGoals: [
      { minute: "22'", player: "Vinícius Jr.", team: "team1" },
      { minute: "54'", player: "R. Lewandowski", team: "team2" },
      { minute: "71'", player: "J. Bellingham", team: "team1", isPenalty: true }
    ],
    footballCards: [
      { minute: "38'", player: "Gavi", team: "team2", type: "yellow" },
      { minute: "65'", player: "E. Camavinga", team: "team1", type: "yellow" }
    ],
    footballStats: {
      possession: [53, 47],
      shots: [15, 12],
      shotsOnTarget: [6, 4],
      corners: [6, 4],
      fouls: [11, 14],
      yellowCards: [1, 1],
      redCards: [0, 0],
      offsides: [2, 1]
    },
    statusText: "2nd Half • 74'",
    footballVenue: "Santiago Bernabéu"
  }
};

function advanceDemoMatch(key: string) {
  const m = demoMatches[key];
  if (!m) return null;

  // Upcoming matches (cricket or football) MUST NEVER advance scores, balls, or minutes!
  if (m.isUpcoming) {
    return {
      ...m,
      score: 0,
      wickets: 0,
      overs: 0,
      ballsInOver: 0,
      totalBalls: 0,
      footballScore1: 0,
      footballScore2: 0,
      footballMinute: "Upcoming",
      footballPeriod: "Not started",
      lastBallSymbol: undefined,
      lastUpdated: new Date().toLocaleTimeString()
    };
  }

  if (m.sport === 'football') {
    // Football live simulator
    let minuteVal = parseInt(String(m.footballMinute).replace(/\D/g, ''), 10) || 74;
    if (m.footballMinute !== 'FT' && minuteVal < 90) {
      if (Math.random() > 0.4) {
        minuteVal += 1;
        m.footballMinute = `${minuteVal}'`;
        m.footballPeriod = minuteVal > 45 ? '2H' : '1H';
        m.statusText = minuteVal > 45 ? `2nd Half • ${minuteVal}'` : `1st Half • ${minuteVal}'`;

        // Rare goal simulation
        if (Math.random() < 0.08) {
          const scoringTeam = Math.random() > 0.5 ? 'team1' : 'team2';
          if (scoringTeam === 'team1') {
            m.footballScore1 = (m.footballScore1 || 0) + 1;
          } else {
            m.footballScore2 = (m.footballScore2 || 0) + 1;
          }
          m.footballGoals = [
            ...(m.footballGoals || []),
            { minute: `${minuteVal}'`, player: scoringTeam === 'team1' ? 'Striker 1' : 'Forward 2', team: scoringTeam }
          ];
        }
      }
    } else if (minuteVal >= 90) {
      minuteVal = 46;
      m.footballMinute = "46'";
      m.footballPeriod = '2H';
      m.statusText = `2nd Half • 46' (${m.footballScore1 ?? 0} - ${m.footballScore2 ?? 0})`;
    }
    return { ...m, isFinished: false, lastUpdated: new Date().toLocaleTimeString() };
  }

  // Full spectrum of outcomes requested: 0, 1, 2, 3, 4, 5, 6, W, WD, NB, LEG BYE, BYE
  const outcomes = ['0', '1', '2', '3', '4', '5', '6', 'W', 'WD', 'NB', 'LEG BYE', 'BYE'];
  const ballSymbol = outcomes[Math.floor(Math.random() * outcomes.length)];

  let isExtra = false;
  let isWicket = false;
  let isLegal = true;
  let runsAdded = 0;

  if (ballSymbol === 'W') {
    isWicket = true;
    m.wickets = Math.min(10, m.wickets + 1);
  } else if (ballSymbol === 'WD') {
    isExtra = true;
    isLegal = false;
    runsAdded = 1;
  } else if (ballSymbol === 'NB') {
    isExtra = true;
    isLegal = false;
    runsAdded = 1;
  } else if (ballSymbol === 'LEG BYE') {
    isExtra = true;
    runsAdded = 1;
  } else if (ballSymbol === 'BYE') {
    isExtra = true;
    runsAdded = 1;
  } else {
    runsAdded = parseInt(ballSymbol, 10) || 0;
  }

  // Advance delivery only if legal delivery
  let bi = m.ballsInOver;
  let ov = m.overs;
  if (isLegal) {
    bi += 1;
    if (bi >= 6) {
      bi = 0;
      ov += 1;
    }
  }
  m.ballsInOver = bi;
  m.overs = ov;
  m.score += runsAdded;
  m.recentBalls = [...(m.recentBalls || []).slice(-5), ballSymbol];

  if (m.batsmen && m.batsmen[0]) {
    if (!isExtra || ballSymbol === 'LEG BYE' || ballSymbol === 'BYE') {
      if (!isExtra) m.batsmen[0].runs += runsAdded;
      if (isLegal) m.batsmen[0].balls += 1;
      if (runsAdded === 4) m.batsmen[0].fours += 1;
      if (runsAdded === 6) m.batsmen[0].sixes += 1;
    }
  }

  const totalBalls = ov * 6 + bi;
  const remainingBalls = Math.max(0, m.maxOvers * 6 - totalBalls);
  const runsRemaining = Math.max(0, (m.target || 0) - m.score);

  if (runsRemaining <= 0) {
    m.statusText = `${m.battingTeam} won the match!`;
  } else if (m.wickets >= 10 || remainingBalls <= 0) {
    m.statusText = `${m.bowlingTeam} won by ${runsRemaining} runs!`;
  } else {
    m.statusText = `${m.battingTeam} need ${runsRemaining} runs in ${remainingBalls} balls`;
  }

  return { ...m, totalBalls, lastBallSymbol: ballSymbol };
}

function getAiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function isExplicitCricketUrl(url: string): boolean {
  const lowerUrl = (url || "").toLowerCase();
  return (
    lowerUrl.includes("crex.") ||
    lowerUrl.includes("cricbuzz.") ||
    lowerUrl.includes("espncricinfo.") ||
    lowerUrl.includes("cricinfo.") ||
    lowerUrl.includes("cricheroes.") ||
    lowerUrl.includes("cricclubs.") ||
    lowerUrl.includes("bcci.tv") ||
    lowerUrl.includes("icc-cricket.") ||
    lowerUrl.includes("/cricket/") ||
    lowerUrl.startsWith("demo://t20") ||
    lowerUrl.startsWith("demo://ban-vs-ind") ||
    lowerUrl.startsWith("demo://ind-vs-pak") ||
    lowerUrl.startsWith("demo://aus-vs-eng") ||
    lowerUrl.startsWith("demo://he-vs-ddw") ||
    lowerUrl.startsWith("demo://bpl") ||
    lowerUrl.startsWith("demo://upcoming") ||
    lowerUrl.startsWith("demo://cricbuzz")
  );
}

const CRICKET_TEAM_MAP: Record<string, string> = {
  ban: "BAN",
  bangladesh: "BAN",
  ind: "IND",
  india: "IND",
  pak: "PAK",
  pakistan: "PAK",
  aus: "AUS",
  australia: "AUS",
  eng: "ENG",
  england: "ENG",
  nz: "NZ",
  "new-zealand": "NZ",
  sa: "SA",
  rsa: "SA",
  "south-africa": "SA",
  wi: "WI",
  "west-indies": "WI",
  sl: "SL",
  "sri-lanka": "SL",
  afg: "AFG",
  afghanistan: "AFG",
  zim: "ZIM",
  zimbabwe: "ZIM",
  ire: "IRE",
  ireland: "IRE",
  ned: "NED",
  netherlands: "NED",
  sco: "SCO",
  scotland: "SCO",
  nep: "NEP",
  nepal: "NEP",
  usa: "USA",
  uae: "UAE",
  oman: "OMAN",
  nam: "NAM",
  namibia: "NAM",
  csk: "CSK",
  mi: "MI",
  rcb: "RCB",
  kkr: "KKR",
  srh: "SRH",
  dc: "DC",
  rr: "RR",
  pbks: "PBKS",
  gt: "GT",
  lsg: "LSG",
  fba: "FBA",
  "fortune-barishal": "FBA",
  cv: "CV",
  "comilla-victorians": "CV",
  rriders: "RGR",
  "rangpur-riders": "RGR",
  dd: "DD",
  "dhaka-capitals": "DC",
  "chittagong-kings": "CK",
  "khulna-tigers": "KT",
  "sylhet-strikers": "SYL",
  "sa-e": "SA-E",
  "sae": "SA-E",
  "south-africa-emerging": "SA-E",
  "wp": "WP",
  "western-province": "WP",
  "eng-c": "ENG-C",
  "engc": "ENG-C",
  "engch": "ENG-C",
  "england-champions": "ENG-C",
  "ind-c": "IND-C",
  "indc": "IND-C",
  "indch": "IND-C",
  "india-champions": "IND-C",
  "aus-c": "AUS-C",
  "ausch": "AUS-C",
  "pak-c": "PAK-C",
  "pakch": "PAK-C",
  "sa-c": "SA-C",
  "sach": "SA-C",
  "wi-c": "WI-C",
  "wich": "WI-C",
  "ban-c": "BAN-C",
  "banch": "BAN-C",
  "vac": "VAC",
  "vancouver-anchors": "VAC",
  "bbz": "BBZ",
  "brampton-blitz": "BBZ",
  "tts": "TTS",
  "toronto-sixers": "TTS",
  "mgm": "MGM",
  "mississauga-masters": "MGM",
  "wrw": "WRW",
  "white-rock-warriors": "WRW",
  "mrt": "MRT",
  "montreal-royal-tigers": "MRT",
  "ind-a": "IND-A",
  "aus-a": "AUS-A",
  "eng-a": "ENG-A",
  "sa-a": "SA-A",
  "pak-a": "PAK-A",
  "ban-a": "BAN-A",
  "nz-a": "NZ-A",
  "sl-a": "SL-A",
  "sa-w": "SA-W",
  "ind-w": "IND-W",
  "aus-w": "AUS-W",
  "eng-w": "ENG-W",
  "nz-w": "NZ-W",
  "wi-w": "WI-W",
  "pak-w": "PAK-W",
  "ban-w": "BAN-W",
  "sl-w": "SL-W"
};

function formatCricketTeamSlug(raw: string): string {
  const cleaned = (raw || "")
    .toLowerCase()
    .replace(/^(?:live|score|scores|match|scoreboard|watch|cricket|series|fixtures|\d+(?:st|nd|rd|th)?)-+/i, "")
    .replace(/-(?:\d+(?:st|nd|rd|th)?|final|semi|qualifier|eliminator|super|group|match|t20i?|odi|test|live|score|scores|series|tour|cup|trophy|league|championship|challenge|provincial|division|legends|world|csa|icc|ipl|bpl|psl|bbl|cpl|hundred|mens|womens|warmup|warm-up|day|session|\d{3,})\b.*$/i, "")
    .replace(/^-+|-+$/g, "")
    .trim();

  if (!cleaned) return "";
  if (CRICKET_TEAM_MAP[cleaned]) return CRICKET_TEAM_MAP[cleaned];

  const words = cleaned.split("-").filter(Boolean);
  if (words.length >= 2 && words[0].length <= 4 && /^(?:e|c|a|w|b|xi|u19)$/i.test(words[1])) {
    const prefix = CRICKET_TEAM_MAP[words[0]] || words[0].toUpperCase();
    return `${prefix}-${words[1].toUpperCase()}`;
  }
  if (words.length >= 2 && CRICKET_TEAM_MAP[`${words[0]}-${words[1]}`]) {
    return CRICKET_TEAM_MAP[`${words[0]}-${words[1]}`];
  }
  if (words.length >= 2 && CRICKET_TEAM_MAP[words[0]] && words.length > 2) {
    return CRICKET_TEAM_MAP[words[0]];
  }
  if (words.length >= 2 && words[words.length - 1] === "emerging") {
    const baseSlug = words.slice(0, -1).join("-");
    const prefix = CRICKET_TEAM_MAP[baseSlug] || words.slice(0, -1).map(w => w[0]?.toUpperCase() || "").join("");
    if (prefix) return `${prefix}-E`;
  }
  if (words.length >= 2 && words[words.length - 1] === "champions") {
    const baseSlug = words.slice(0, -1).join("-");
    const prefix = CRICKET_TEAM_MAP[baseSlug] || words.slice(0, -1).map(w => w[0]?.toUpperCase() || "").join("");
    if (prefix) return `${prefix}-C`;
  }
  if (words.length === 1 && words[0].length <= 4) {
    return words[0].toUpperCase();
  }
  return words.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

function matchCricketTeamToken(rawToken: string, t1: string, t2: string): string | null {
  const tok = (rawToken || "")
    .replace(/^(?:track|watch|live|stream|summary|opt|opted|won|need|needs)\s+/i, "")
    .replace(/[^A-Za-z0-9\s-]/g, "")
    .trim();
  if (!tok || tok.length < 2) return null;
  const slugTok = formatCricketTeamSlug(tok.toLowerCase().replace(/\s+/g, "-"));
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9-]/g, "");
  const nTok = norm(slugTok || tok);
  const nTokRaw = norm(tok);
  const n1 = norm(t1);
  const n2 = norm(t2);
  const n1Slug = norm(formatCricketTeamSlug(t1.toLowerCase().replace(/\s+/g, "-")));
  const n2Slug = norm(formatCricketTeamSlug(t2.toLowerCase().replace(/\s+/g, "-")));

  if (nTok === n1 || nTok === n1Slug || nTokRaw === n1 || nTokRaw === n1Slug) return t1;
  if (nTok === n2 || nTok === n2Slug || nTokRaw === n2 || nTokRaw === n2Slug) return t2;

  // Check suffix-preserving prefix match (never match IND-C to ENG-C!)
  const hasSuffix = (s: string) => /-(?:e|c|a|w|b|xi|u19)$/i.test(s);
  if (!hasSuffix(nTok) && !hasSuffix(n1) && (n1.startsWith(nTok) || nTok.startsWith(n1) || n1.startsWith(nTokRaw) || nTokRaw.startsWith(n1))) return t1;
  if (!hasSuffix(nTok) && !hasSuffix(n2) && (n2.startsWith(nTok) || nTok.startsWith(n2) || n2.startsWith(nTokRaw) || nTokRaw.startsWith(n2))) return t2;

  return null;
}

function isPlaceholderCricketTeam(s?: string): boolean {
  if (!s) return true;
  const trimmed = s.trim();
  return (
    !trimmed ||
    /^(?:team\s*[12ab]|টিম\s*[এবি১২12]|home|away|crex|cricket\s*exchange|cricbuzz|espncricinfo|live\s*cricket(?:\s*score)?|cricket\s*live|scoreboard)$/i.test(trimmed)
  );
}

function extractTeamsFromCricketUrl(inputUrl: string): { team1: string; team2: string; fromUrl?: boolean } {
  try {
    const withoutQuery = (inputUrl || "").split("#")[0].split("?")[0];
    const segments = withoutQuery.replace(/^[a-z0-9]+:\/\//i, "").split("/").filter(Boolean);

    // Find segment with -vs- or -v-
    const vsSeg = segments.find(s => /-vs-|-v-/i.test(s));
    if (vsSeg) {
      const parts = vsSeg.split(/-vs-|-v-/i);
      const t1 = formatCricketTeamSlug(parts[0] || "");
      const t2 = formatCricketTeamSlug(parts[1] || "");
      if (t1 && t2) {
        return { team1: t1, team2: t2, fromUrl: true };
      }
    }

    // Fallback: check any hyphenated segment that isn't a generic path word
    const ignore = new Set(["live-cricket-scores", "live-cricket-score", "cricket-scores", "cricket-match", "live-scores", "scoreboard", "live", "full-scorecard"]);
    for (let i = segments.length - 1; i >= 0; i--) {
      const seg = segments[i];
      if (!seg.includes("-") || ignore.has(seg.toLowerCase()) || /^\d+$/.test(seg)) continue;
      const words = seg.split("-").filter(Boolean);
      if (words.length >= 2) {
        const t1 = formatCricketTeamSlug(words[0]);
        const t2 = formatCricketTeamSlug(words[1]);
        if (t1 && t2 && t1 !== t2) {
          return { team1: t1, team2: t2, fromUrl: true };
        }
      }
    }
  } catch {}
  return { team1: "BAN", team2: "IND", fromUrl: false };
}

// Helper to detect if a URL or text is Football/Soccer
function isFootballMatch(url: string, content = ""): boolean {
  const lowerUrl = (url || "").toLowerCase();
  const lowerContent = (content || "").toLowerCase();

  // Explicit cricket URLs or cricket page content should NEVER be classified as football
  if (isExplicitCricketUrl(lowerUrl)) {
    return false;
  }

  // Dedicated football schemes & domains
  if (
    lowerUrl.startsWith("sofascore://") ||
    lowerUrl.startsWith("football://") ||
    lowerUrl.includes("sofascore.com/football") ||
    lowerUrl.includes("fotmob.com") ||
    lowerUrl.includes("flashscore.") ||
    lowerUrl.includes("livescore.") ||
    lowerUrl.includes("onefootball.com") ||
    lowerUrl.includes("goal.com") ||
    lowerUrl.includes("whoscored.com") ||
    lowerUrl.includes("besoccer.com") ||
    lowerUrl.includes("365scores.com") ||
    lowerUrl.includes("espn.com/soccer") ||
    lowerUrl.includes("espn.in/football") ||
    lowerUrl.includes("bbc.com/sport/football") ||
    lowerUrl.includes("bbc.co.uk/sport/football") ||
    lowerUrl.includes("fifa.com") ||
    lowerUrl.includes("uefa.com")
  ) {
    return true;
  }

  // If content clearly has cricket terminology, never classify as football
  if (
    /\b(?:cricket|wickets?|overs?|innings|batsman|batter|bowler|cricinfo|cricbuzz|crex|t20i?|odi|ipl|bpl|psl|cpl|bbl|run\s*rate)\b/i.test(
      lowerUrl + " " + lowerContent
    )
  ) {
    return false;
  }

  // If sofascore URL without /cricket/
  if (lowerUrl.includes("sofascore.com") && !lowerUrl.includes("cricket")) {
    return true;
  }

  const clean = (lowerUrl + " " + lowerContent).toLowerCase();

  if (
    clean.includes("sofascore.com/football") ||
    clean.includes("/football/") ||
    clean.includes("/soccer/") ||
    clean.includes("laliga") ||
    clean.includes("la-liga") ||
    clean.includes("english-premier-league") ||
    clean.includes("uefa-champions-league") ||
    clean.includes("champions-league") ||
    clean.includes("serie-a") ||
    clean.includes("bundesliga") ||
    clean.includes("ligue-1") ||
    clean.includes("copa-america") ||
    clean.includes("saudi-pro-league") ||
    clean.includes("fifa") ||
    clean.includes("uefa")
  ) {
    return true;
  }
  if (
    clean.includes("real-madrid") ||
    clean.includes("barcelona") ||
    clean.includes("arsenal") ||
    clean.includes("chelsea") ||
    clean.includes("man-city") ||
    clean.includes("manchester-city") ||
    clean.includes("manchester-united") ||
    clean.includes("man-utd") ||
    clean.includes("liverpool") ||
    clean.includes("bayern") ||
    clean.includes("dortmund") ||
    clean.includes("psg") ||
    clean.includes("paris-saint-germain") ||
    clean.includes("juventus") ||
    clean.includes("inter-milan") ||
    clean.includes("ac-milan") ||
    clean.includes("inter-miami") ||
    clean.includes("al-nassr") ||
    clean.includes("al-hilal") ||
    clean.includes("atletico-madrid") ||
    clean.includes("tottenham") ||
    clean.includes("cadiz") ||
    clean.includes("cádiz") ||
    clean.includes("leganes") ||
    clean.includes("leganés") ||
    clean.includes("argentina") ||
    clean.includes("brazil") ||
    clean.includes("portugal") ||
    clean.includes("spain") ||
    clean.includes("germany") ||
    clean.includes("italy") ||
    clean.includes("croatia")
  ) {
    return true;
  }
  return false;
}

const KNOWN_MULTIWORD_FOOTBALL_TEAMS = [
  "brighton-and-hove-albion",
  "wolverhampton-wanderers",
  "bosnia-and-herzegovina",
  "paris-saint-germain",
  "fatsa-belediyespor",
  "sebat-genclikspor",
  "republic-of-ireland",
  "manchester-united",
  "borussia-dortmund",
  "tottenham-hotspur",
  "nottingham-forest",
  "bashundhara-kings",
  "yeni-malatyaspor",
  "bayer-leverkusen",
  "newcastle-united",
  "sheffield-united",
  "northern-ireland",
  "fatih-karagumruk",
  "adana-demirspor",
  "alanya-1221-fsk",
  "atletico-madrid",
  "manchester-city",
  "west-ham-united",
  "athletic-bilbao",
  "north-macedonia",
  "alanya-1221-fk",
  "sanliurfaspor",
  "genclerbirligi",
  "crystal-palace",
  "leicester-city",
  "rayo-vallecano",
  "czech-republic",
  "dhaka-abahani",
  "orduspor-1967",
  "keciorengucu",
  "bayern-munich",
  "real-sociedad",
  "athletic-club",
  "united-states",
  "kars-36-spor",
  "istanbulspor",
  "karagumruk",
  "gaziantep-fk",
  "bandirmaspor",
  "umraniyespor",
  "erzurumspor",
  "alanya-1221",
  "mardin-1969",
  "real-madrid",
  "inter-miami",
  "inter-milan",
  "aston-villa",
  "leeds-united",
  "saudi-arabia",
  "boca-juniors",
  "south-africa",
  "east-bengal",
  "mohun-bagan",
  "sakaryaspor",
  "kocaelispor",
  "giresunspor",
  "antalyaspor",
  "trabzonspor",
  "basaksehir",
  "fenerbahce",
  "galatasaray",
  "rb-leipzig",
  "real-betis",
  "celta-vigo",
  "al-ittihad",
  "al-ettifaq",
  "river-plate",
  "south-korea",
  "new-zealand",
  "ivory-coast",
  "pendikspor",
  "samsunspor",
  "alanyaspor",
  "ankaraspor",
  "ankaragucu",
  "denizlispor",
  "aliaga-fk",
  "bodrum-fk",
  "manisa-fk",
  "corum-fk",
  "igdir-fk",
  "muglaspor",
  "sivas-68",
  "sivasspor",
  "konyaspor",
  "kasimpasa",
  "hatayspor",
  "bursaspor",
  "somaspor",
  "karsspor",
  "eyupspor",
  "rizespor",
  "boluspor",
  "amedspor",
  "adanaspor",
  "besiktas",
  "man-city",
  "ac-milan",
  "west-ham",
  "al-nassr",
  "al-hilal",
  "sao-paulo",
  "costa-rica",
  "man-utd",
  "al-ahli",
  "goztepe",
  "sariyer"
].sort((a, b) => b.length - a.length);

const SOFASCORE_BASE50_DIGITS = "abcdefghijklmnopqr" + "tuvwxyz" + "ABCDEFGHIJKLMNOPQR" + "TUVWXYZ";

function encodeSofascoreTeamId(num: number): string {
  if (!num || num <= 0) return "a";
  let out = "";
  let n = Math.floor(num);
  while (n > 0) {
    out += SOFASCORE_BASE50_DIGITS[n % 50];
    n = Math.floor(n / 50);
  }
  return out;
}

function decodeSofascoreTeamId(code: string): number {
  let val = 0;
  let mul = 1;
  for (const ch of code) {
    const idx = SOFASCORE_BASE50_DIGITS.indexOf(ch);
    if (idx === -1) return 0;
    val += idx * mul;
    mul *= 50;
  }
  return val;
}

function buildSofascoreCustomId(id1: number, id2: number): string {
  const minId = Math.min(id1, id2);
  const maxId = Math.max(id1, id2);
  return `${encodeSofascoreTeamId(minId)}s${encodeSofascoreTeamId(maxId)}`;
}

interface SofascoreTeamMeta {
  id: number;
  slug: string;
  displayName: string;
  aliases: string[];
}

const SOFASCORE_KNOWN_TEAMS_LIST: SofascoreTeamMeta[] = [
  { id: 325526, slug: "somaspor", displayName: "Somaspor", aliases: ["somaspor", "soma"] },
  { id: 362070, slug: "alanya-1221", displayName: "Alanya 1221 FSK", aliases: ["alanya-1221", "alanya-1221-fsk", "alanya-1221-fk", "alanya1221", "alanya1221fsk", "kestelspor", "alanya-kestelspor"] },
  { id: 261256, slug: "kars-36-spor", displayName: "Kars 36 Spor", aliases: ["kars-36-spor", "kars36spor", "karsspor", "kars-36"] },
  { id: 296728, slug: "fatsa-belediyespor", displayName: "Fatsa Belediyespor", aliases: ["fatsa-belediyespor", "fatsabelediyespor", "fatsa"] },
  { id: 4954, slug: "fatih-karagumruk", displayName: "Fatih Karagümrük", aliases: ["fatih-karagumruk", "fatihkaragumruk", "karagumruk"] },
  { id: 3066, slug: "istanbulspor", displayName: "Istanbulspor", aliases: ["istanbulspor", "istanbulspor-as"] },
  { id: 3061, slug: "galatasaray", displayName: "Galatasaray", aliases: ["galatasaray"] },
  { id: 3052, slug: "fenerbahce", displayName: "Fenerbahçe", aliases: ["fenerbahce"] },
  { id: 3050, slug: "besiktas", displayName: "Beşiktaş", aliases: ["besiktas"] },
  { id: 3051, slug: "trabzonspor", displayName: "Trabzonspor", aliases: ["trabzonspor"] },
  { id: 3086, slug: "basaksehir-fk", displayName: "Başakşehir FK", aliases: ["basaksehir", "istanbul-basaksehir"] },
  { id: 6063, slug: "kasimpasa", displayName: "Kasımpaşa", aliases: ["kasimpasa"] },
  { id: 3076, slug: "sivasspor", displayName: "Sivasspor", aliases: ["sivasspor"] },
  { id: 3056, slug: "antalyaspor", displayName: "Antalyaspor", aliases: ["antalyaspor"] },
  { id: 3085, slug: "konyaspor", displayName: "Konyaspor", aliases: ["konyaspor"] },
  { id: 6362, slug: "alanyaspor", displayName: "Alanyaspor", aliases: ["alanyaspor"] },
  { id: 3064, slug: "caykur-rizespor", displayName: "Çaykur Rizespor", aliases: ["rizespor", "caykur-rizespor"] },
  { id: 7012, slug: "gaziantep-fk", displayName: "Gaziantep FK", aliases: ["gaziantep", "gaziantep-fk"] },
  { id: 3091, slug: "hatayspor", displayName: "Hatayspor", aliases: ["hatayspor"] },
  { id: 7040, slug: "eyupspor", displayName: "Eyüpspor", aliases: ["eyupspor"] },
  { id: 3054, slug: "goztepe", displayName: "Göztepe", aliases: ["goztepe"] },
  { id: 3053, slug: "samsunspor", displayName: "Samsunspor", aliases: ["samsunspor"] },
  { id: 205939, slug: "bodrum-fk", displayName: "Bodrum FK", aliases: ["bodrum", "bodrum-fk", "bodrumspor"] },
  { id: 3081, slug: "adana-demirspor", displayName: "Adana Demirspor", aliases: ["adana-demirspor", "adanademirspor"] },
  { id: 3059, slug: "mke-ankaragucu", displayName: "MKE Ankaragücü", aliases: ["ankaragucu", "mke-ankaragucu"] },
  { id: 7029, slug: "pendikspor", displayName: "Pendikspor", aliases: ["pendikspor"] },
  { id: 44323, slug: "umraniyespor", displayName: "Ümraniyespor", aliases: ["umraniyespor"] },
  { id: 3078, slug: "sakaryaspor", displayName: "Sakaryaspor", aliases: ["sakaryaspor"] },
  { id: 3065, slug: "kocaelispor", displayName: "Kocaelispor", aliases: ["kocaelispor"] },
  { id: 4952, slug: "bandirmaspor", displayName: "Bandırmaspor", aliases: ["bandirmaspor"] },
  { id: 3062, slug: "genclerbirligi", displayName: "Gençlerbirliği", aliases: ["genclerbirligi"] },
  { id: 214138, slug: "erzurumspor-fk", displayName: "Erzurumspor FK", aliases: ["erzurumspor", "erzurumspor-fk"] },
  { id: 3082, slug: "boluspor", displayName: "Boluspor", aliases: ["boluspor"] },
  { id: 7015, slug: "ankara-keciorengucu", displayName: "Keçiörengücü", aliases: ["keciorengucu", "ankara-keciorengucu"] },
  { id: 214141, slug: "manisa-fk", displayName: "Manisa FK", aliases: ["manisa-fk", "manisafk"] },
  { id: 117680, slug: "corum-fk", displayName: "Çorum FK", aliases: ["corum-fk", "corumfk", "corum"] },
  { id: 168590, slug: "amed-sportif-faaliyetler", displayName: "Amedspor", aliases: ["amedspor", "amed"] },
  { id: 7028, slug: "sanliurfaspor", displayName: "Şanlıurfaspor", aliases: ["sanliurfaspor"] },
  { id: 397478, slug: "igdir-fk", displayName: "Iğdır FK", aliases: ["igdir-fk", "igdirfk", "igdir"] },
  { id: 397472, slug: "orduspor-1967", displayName: "Orduspor 1967", aliases: ["orduspor-1967", "orduspor"] },
  { id: 7023, slug: "muglaspor", displayName: "Muğlaspor", aliases: ["muglaspor"] },
  { id: 4957, slug: "sariyer", displayName: "Sarıyer", aliases: ["sariyer"] },
  { id: 3057, slug: "ankaraspor", displayName: "Ankaraspor", aliases: ["ankaraspor"] },
  { id: 2829, slug: "real-madrid", displayName: "Real Madrid", aliases: ["real-madrid", "realmadrid"] },
  { id: 2817, slug: "barcelona", displayName: "Barcelona", aliases: ["barcelona", "fc-barcelona", "barca"] },
  { id: 2836, slug: "atletico-madrid", displayName: "Atlético Madrid", aliases: ["atletico-madrid", "atleticomadrid"] },
  { id: 2833, slug: "sevilla", displayName: "Sevilla", aliases: ["sevilla"] },
  { id: 2819, slug: "villarreal", displayName: "Villarreal", aliases: ["villarreal"] },
  { id: 2824, slug: "real-sociedad", displayName: "Real Sociedad", aliases: ["real-sociedad"] },
  { id: 2825, slug: "athletic-club", displayName: "Athletic Club", aliases: ["athletic-club", "athletic-bilbao"] },
  { id: 2816, slug: "real-betis", displayName: "Real Betis", aliases: ["real-betis"] },
  { id: 2828, slug: "valencia", displayName: "Valencia", aliases: ["valencia"] },
  { id: 24264, slug: "girona-fc", displayName: "Girona", aliases: ["girona", "girona-fc"] },
  { id: 42, slug: "arsenal", displayName: "Arsenal", aliases: ["arsenal", "arsenal-fc"] },
  { id: 38, slug: "chelsea", displayName: "Chelsea", aliases: ["chelsea", "chelsea-fc"] },
  { id: 17, slug: "manchester-city", displayName: "Manchester City", aliases: ["manchester-city", "man-city", "mancity"] },
  { id: 44, slug: "liverpool", displayName: "Liverpool", aliases: ["liverpool", "liverpool-fc"] },
  { id: 35, slug: "manchester-united", displayName: "Manchester United", aliases: ["manchester-united", "man-utd", "manutd"] },
  { id: 33, slug: "tottenham-hotspur", displayName: "Tottenham Hotspur", aliases: ["tottenham", "tottenham-hotspur", "spurs"] },
  { id: 39, slug: "newcastle-united", displayName: "Newcastle United", aliases: ["newcastle", "newcastle-united"] },
  { id: 40, slug: "aston-villa", displayName: "Aston Villa", aliases: ["aston-villa"] },
  { id: 30, slug: "brighton-and-hove-albion", displayName: "Brighton", aliases: ["brighton", "brighton-and-hove-albion"] },
  { id: 37, slug: "west-ham-united", displayName: "West Ham United", aliases: ["west-ham", "west-ham-united"] },
  { id: 2672, slug: "bayern-munchen", displayName: "Bayern Munich", aliases: ["bayern", "bayern-munich", "bayern-munchen"] },
  { id: 2673, slug: "borussia-dortmund", displayName: "Borussia Dortmund", aliases: ["dortmund", "borussia-dortmund"] },
  { id: 2681, slug: "bayer-04-leverkusen", displayName: "Bayer Leverkusen", aliases: ["leverkusen", "bayer-leverkusen", "bayer-04-leverkusen"] },
  { id: 36360, slug: "rb-leipzig", displayName: "RB Leipzig", aliases: ["rb-leipzig", "leipzig"] },
  { id: 2697, slug: "inter", displayName: "Inter", aliases: ["inter", "inter-milan", "internazionale"] },
  { id: 2687, slug: "juventus", displayName: "Juventus", aliases: ["juventus", "juve"] },
  { id: 2692, slug: "milan", displayName: "AC Milan", aliases: ["ac-milan", "milan"] },
  { id: 2714, slug: "napoli", displayName: "Napoli", aliases: ["napoli"] },
  { id: 2702, slug: "roma", displayName: "AS Roma", aliases: ["as-roma", "roma"] },
  { id: 2699, slug: "lazio", displayName: "Lazio", aliases: ["lazio"] },
  { id: 2686, slug: "atalanta", displayName: "Atalanta", aliases: ["atalanta"] },
  { id: 1644, slug: "paris-saint-germain", displayName: "Paris Saint-Germain", aliases: ["psg", "paris-saint-germain"] },
  { id: 1641, slug: "olympique-de-marseille", displayName: "Marseille", aliases: ["marseille", "olympique-de-marseille"] },
  { id: 1653, slug: "as-monaco", displayName: "AS Monaco", aliases: ["monaco", "as-monaco"] },
  { id: 3006, slug: "benfica", displayName: "Benfica", aliases: ["benfica", "sl-benfica"] },
  { id: 3002, slug: "fc-porto", displayName: "FC Porto", aliases: ["porto", "fc-porto"] },
  { id: 3001, slug: "sporting", displayName: "Sporting CP", aliases: ["sporting", "sporting-cp"] },
  { id: 2953, slug: "ajax", displayName: "Ajax", aliases: ["ajax"] },
  { id: 23400, slug: "al-nassr", displayName: "Al-Nassr", aliases: ["al-nassr", "alnassr"] },
  { id: 21895, slug: "al-hilal", displayName: "Al-Hilal", aliases: ["al-hilal", "alhilal"] },
  { id: 337602, slug: "inter-miami-cf", displayName: "Inter Miami", aliases: ["inter-miami", "inter-miami-cf"] },
  { id: 4819, slug: "argentina", displayName: "Argentina", aliases: ["argentina"] },
  { id: 4748, slug: "brazil", displayName: "Brazil", aliases: ["brazil"] },
  { id: 4481, slug: "france", displayName: "France", aliases: ["france"] },
  { id: 4713, slug: "england", displayName: "England", aliases: ["england"] },
  { id: 4698, slug: "spain", displayName: "Spain", aliases: ["spain"] },
  { id: 4711, slug: "germany", displayName: "Germany", aliases: ["germany"] },
  { id: 4704, slug: "portugal", displayName: "Portugal", aliases: ["portugal"] },
  { id: 4707, slug: "italy", displayName: "Italy", aliases: ["italy"] },
  { id: 4705, slug: "netherlands", displayName: "Netherlands", aliases: ["netherlands"] },
  { id: 4715, slug: "croatia", displayName: "Croatia", aliases: ["croatia"] },
  { id: 4745, slug: "bangladesh", displayName: "Bangladesh", aliases: ["bangladesh"] },
  { id: 4765, slug: "india", displayName: "India", aliases: ["india"] }
];

const SOFASCORE_TEAM_BY_ID = new Map<number, SofascoreTeamMeta>(
  SOFASCORE_KNOWN_TEAMS_LIST.map((t) => [t.id, t])
);

const generatedFootballUrlTeamsMap = new Map<
  string,
  { team1: string; team2: string; dateTime?: string; league?: string }
>();

function normalizeAsciiSlugLookup(s: string): string {
  return String(s || "")
    .replace(/[ıİ]/g, "i")
    .replace(/[ğĞ]/g, "g")
    .replace(/[üÜ]/g, "u")
    .replace(/[şŞ]/g, "s")
    .replace(/[öÖ]/g, "o")
    .replace(/[çÇ]/g, "c")
    .replace(/ß/g, "ss")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function findKnownSofascoreTeam(rawName: string): SofascoreTeamMeta | null {
  const slug = normalizeAsciiSlugLookup(rawName);
  if (!slug) return null;
  const compact = slug.replace(/-/g, "");
  const stripped = slug
    .replace(/\b(?:fc|cf|sc|fk|sk|fsk|as|ac|cd|ud|club)\b/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
  for (const item of SOFASCORE_KNOWN_TEAMS_LIST) {
    if (
      item.slug === slug ||
      item.slug === stripped ||
      item.aliases.includes(slug) ||
      item.aliases.includes(compact) ||
      ( stripped && item.aliases.includes(stripped) )
    ) {
      return item;
    }
  }
  return null;
}

function buildSofascoreMatchUrl(rawT1: string, rawT2: string, fallbackHash: number): string {
  const known1 = findKnownSofascoreTeam(rawT1);
  const known2 = findKnownSofascoreTeam(rawT2);
  if (known1 && known2) {
    const customId = buildSofascoreCustomId(known1.id, known2.id);
    // On Sofascore, the higher teamId slug is placed first in the match path
    const firstSlug = known1.id >= known2.id ? known1.slug : known2.slug;
    const secondSlug = known1.id >= known2.id ? known2.slug : known1.slug;
    return `https://www.sofascore.com/football/match/${firstSlug}-${secondSlug}/${customId}`;
  }
  const s1 = known1?.slug || normalizeAsciiSlugLookup(rawT1) || "team-1";
  const s2 = known2?.slug || normalizeAsciiSlugLookup(rawT2) || "team-2";
  const fakeId1 = known1?.id || ((fallbackHash % 350000) + 2500);
  const fakeId2 = known2?.id || (((Math.floor(fallbackHash / 13) + 9187) % 350000) + 2500);
  const customId = buildSofascoreCustomId(fakeId1, fakeId2);
  return `https://www.sofascore.com/football/match/${s1}-${s2}/${customId}`;
}

function formatTeamSlugPart(slug: string): string {
  return slug
    .replace(/-/g, " ")
    .trim()
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

function extractTeamsFromFootballUrl(inputUrl: string): { team1: string; team2: string; fromUrl?: boolean } {
  try {
    const withoutHash = inputUrl.split("#")[0].split("?")[0].trim();
    const mappedFull = generatedFootballUrlTeamsMap.get(withoutHash.toLowerCase());
    if (mappedFull && mappedFull.team1 && mappedFull.team2) {
      return { team1: mappedFull.team1, team2: mappedFull.team2, fromUrl: true };
    }

    const cleanScheme = withoutHash.replace(/^[a-z0-9]+:\/\//i, "");
    const parts = cleanScheme.split("/").filter(Boolean);

    // Check if Sofascore customId in last segment decodes to known teams
    const lastSeg = parts[parts.length - 1] || "";
    if (!lastSeg.includes("-") && /^[A-Za-z]{2,14}$/.test(lastSeg) && lastSeg.includes("s")) {
      const sIdx = lastSeg.indexOf("s");
      const leftCode = lastSeg.slice(0, sIdx);
      const rightCode = lastSeg.slice(sIdx + 1);
      if (leftCode && rightCode && !rightCode.includes("s")) {
        const idA = decodeSofascoreTeamId(leftCode);
        const idB = decodeSofascoreTeamId(rightCode);
        const teamA = SOFASCORE_TEAM_BY_ID.get(idA);
        const teamB = SOFASCORE_TEAM_BY_ID.get(idB);
        if (teamA && teamB) {
          const prevSeg = (parts[parts.length - 2] || "").toLowerCase();
          if (prevSeg.startsWith(teamB.slug)) {
            return { team1: teamB.displayName, team2: teamA.displayName, fromUrl: true };
          }
          return { team1: teamA.displayName, team2: teamB.displayName, fromUrl: true };
        }
      }
    }
    const ignoreSegments = new Set([
      "www.sofascore.com",
      "sofascore.com",
      "www.fotmob.com",
      "fotmob.com",
      "www.flashscore.com",
      "flashscore.com",
      "www.livescore.com",
      "livescore.com",
      "www.goal.com",
      "goal.com",
      "onefootball.com",
      "www.onefootball.com",
      "en",
      "en-us",
      "en-gb",
      "bn",
      "es",
      "pt",
      "de",
      "fr",
      "it",
      "football",
      "soccer",
      "match",
      "matches",
      "game",
      "games",
      "scores",
      "live",
      "fixtures",
      "results",
      "h2h",
      "summary",
      "lineups",
      "stats",
      "tracker",
      "tournament",
      "tournaments",
      "event",
      "events",
      "spain",
      "england",
      "italy",
      "germany",
      "france",
      "europe",
      "world",
      "south-america",
      "asia",
      "international",
      "laliga",
      "la-liga",
      "premier-league",
      "english-premier-league",
      "champions-league",
      "uefa-champions-league",
      "serie-a",
      "bundesliga",
      "ligue-1",
      "copa-america",
      "saudi-pro-league",
      "mls",
      "club-friendly-games",
      "world-cup",
      "euro",
      "uefa-nations-league",
      "nations-league"
    ]);

    // Filter candidate segments that contain hyphens and are not ignored
    const hyphenCandidates = parts.filter((seg) => {
      const lower = seg.toLowerCase();
      if (ignoreSegments.has(lower)) return false;
      if (/^\d+$/.test(seg)) return false;
      // Ignore Sofascore custom alphanumeric IDs (e.g. "Thbsrgb", "kPbsLNb") which have no hyphens
      if (!seg.includes("-")) return false;
      return true;
    });

    // Prefer segments with -vs- or -v-, or the last hyphenated segment before the ID
    const vsSegment = hyphenCandidates.find((s) => /-vs-|-v-/i.test(s));
    const chosenSlug = (vsSegment || hyphenCandidates[hyphenCandidates.length - 1] || "")
      .replace(/-(?:live|scores?|match|updates?|preview|highlights?|stream|today|upcoming|not-started)$/gi, "")
      .toLowerCase();

    if (!chosenSlug) {
      return { team1: "Team 1", team2: "Team 2", fromUrl: false };
    }

    const mappedBySlug = generatedFootballUrlTeamsMap.get(chosenSlug);
    if (mappedBySlug && mappedBySlug.team1 && mappedBySlug.team2) {
      return { team1: mappedBySlug.team1, team2: mappedBySlug.team2, fromUrl: true };
    }

    if (/-vs-|-v-/i.test(chosenSlug)) {
      const [raw1, raw2] = chosenSlug.split(/-vs-|-v-/i);
      const t1 = formatTeamSlugPart(raw1 || "");
      const t2 = formatTeamSlugPart(raw2 || "");
      if (t1 && t2) {
        return { team1: t1, team2: t2, fromUrl: true };
      }
    }

    // Check if slug starts or ends with a known multi-word team (sorted longest-first)
    for (const known of KNOWN_MULTIWORD_FOOTBALL_TEAMS) {
      if (chosenSlug.startsWith(known + "-")) {
        const rest = chosenSlug.slice(known.length + 1);
        if (rest) {
          return {
            team1: formatTeamSlugPart(known),
            team2: formatTeamSlugPart(rest),
            fromUrl: true
          };
        }
      }
      if (chosenSlug.endsWith("-" + known)) {
        const first = chosenSlug.slice(0, chosenSlug.length - known.length - 1);
        if (first) {
          return {
            team1: formatTeamSlugPart(first),
            team2: formatTeamSlugPart(known),
            fromUrl: true
          };
        }
      }
    }

    // Merge numeric tokens (e.g. "1221", "36", "04", "96") with their adjacent team word so "somaspor-alanya-1221" splits into ["somaspor", "alanya-1221"]
    const rawWords = chosenSlug.split("-").filter(Boolean);
    const mergedWords: string[] = [];
    for (let i = 0; i < rawWords.length; i++) {
      const w = rawWords[i];
      if (/^\d+$/.test(w) && mergedWords.length > 0) {
        mergedWords[mergedWords.length - 1] = `${mergedWords[mergedWords.length - 1]}-${w}`;
      } else if (
        /^(?:spor|belediyespor|fsk|fk|sk|fc|sc|united|city)$/i.test(w) &&
        mergedWords.length > 0 &&
        i < rawWords.length - 1
      ) {
        mergedWords[mergedWords.length - 1] = `${mergedWords[mergedWords.length - 1]}-${w}`;
      } else {
        mergedWords.push(w);
      }
    }

    if (mergedWords.length >= 2) {
      const mid = Math.ceil(mergedWords.length / 2);
      return {
        team1: formatTeamSlugPart(mergedWords.slice(0, mid).join("-")),
        team2: formatTeamSlugPart(mergedWords.slice(mid).join("-")),
        fromUrl: true
      };
    }
  } catch {}

  return { team1: "Team 1", team2: "Team 2", fromUrl: false };
}

// Helper to find match key from any URL or slug:
function resolveMatchKey(inputUrl: string): string | null {
  if (!inputUrl) return null;
  const clean = inputUrl.trim().toLowerCase();

  if (clean.startsWith("sofascore://") || clean.startsWith("football://")) {
    for (const key of Object.keys(demoMatches)) {
      if (key.startsWith("sofascore://") && (clean === key.toLowerCase() || clean.includes(key.replace("sofascore://", "")))) {
        return key;
      }
    }
    if (clean.includes("croatia") && clean.includes("england")) {
      return "sofascore://croatia-vs-england";
    }
    if (clean.includes("real") && (clean.includes("madrid") || clean.includes("barca") || clean.includes("barcelona"))) {
      return "sofascore://real-madrid-vs-barcelona";
    }
    if (clean.includes("arsenal") && clean.includes("chelsea")) {
      return "sofascore://arsenal-vs-chelsea";
    }
    if ((clean.includes("city") || clean.includes("manchester")) && clean.includes("liverpool")) {
      return "sofascore://man-city-vs-liverpool";
    }
    // Never fall back to cricket demo for sofascore:// or football:// URLs!
    return null;
  }

  // Only map explicit demo:// or test:// schemes to demoMatches
  if (clean.startsWith("demo://") || clean.startsWith("test://")) {
    for (const key of Object.keys(demoMatches)) {
      if (clean === key.toLowerCase() || clean.includes(key.replace("demo://", ""))) {
        return key;
      }
    }
    if (clean.includes("football") || clean.includes("soccer")) {
      return "demo://football-live";
    }
    return "demo://t20-live";
  }

  return null;
}

const liveUrlScrapeCache = new Map<string, { time: number; result: any }>();
const inFlightLiveUrlPromises = new Map<string, Promise<any>>();
const crexResolvedUrlCache = new Map<string, string>();
const crexScorecardHtmlCache = new Map<string, { time: number; html: string; refreshing?: boolean }>();
const footballWebSearchCache = new Map<string, { time: number; result: any }>();
const liveSseClients = new Set<express.Response>();
const activeHotPolledUrls = new Map<
  string,
  {
    url: string;
    team1?: string;
    team2?: string;
    sport?: string;
    lastRequestedAt: number;
    isFetching: boolean;
    lastSignature: string;
  }
>();

function computeLiveResultSignature(res: any): string {
  if (!res) return "";
  const batSig = Array.isArray(res.batsmen)
    ? res.batsmen.map((b: any) => `${b.name}:${b.runs}/${b.balls}`).join("|")
    : "";
  return [
    res.sport,
    res.team1,
    res.team2,
    res.score,
    res.wickets,
    res.overs,
    res.ballsInOver,
    res.totalBalls,
    res.team1Score,
    res.team2Score,
    res.firstInningsScore,
    res.target,
    res.footballScore1,
    res.footballScore2,
    res.footballMinute,
    res.footballPeriod,
    res.isUpcoming,
    res.isFinished,
    res.statusText,
    res.lastBallSymbol,
    batSig
  ].join("~");
}

function broadcastLiveMatchSse(url: string, data: any) {
  if (liveSseClients.size === 0 || !data) return;
  const payload = `data: ${JSON.stringify({ url, data, ts: Date.now() })}\n\n`;
  for (const client of liveSseClients) {
    try {
      client.write(payload);
    } catch {
      liveSseClients.delete(client);
    }
  }
}

let espnScoreboardCache: { time: number; events: any[]; refreshing?: boolean } = { time: 0, events: [] };
let espnMultiDayCache: { time: number; events: any[]; refreshing?: boolean } = { time: 0, events: [] };
let scores365AllGamesCache: { time: number; games: any[]; refreshing?: boolean } = { time: 0, games: [] };
const scores365SearchCache = new Map<string, { time: number; games: any[] }>();
const scores365GameDetailCache = new Map<number, { time: number; game: any }>();
let crexLiveFixturesCache: { time: number; items: Array<{ url: string; slug: string; text: string }> } = { time: 0, items: [] };

function formatEspnDateParam(d: Date): string {
  return d.toISOString().slice(0, 10).replace(/-/g, "");
}

function formatGoalMinuteStr(rawMin?: string): string {
  if (!rawMin) return "45'";
  // Convert "90'+4'" -> "90+4'" while keeping single trailing apostrophe
  return String(rawMin).trim().replace(/['’]\s*\+\s*(\d+)\s*['’]?/, "+$1'");
}

// Fetch real-time live, finished, and upcoming football match data from ESPN's public soccer scoreboard API
// Works even when Sofascore/Flashscore block cloud IPs with 403!
async function tryFetchEspnSoccerMatch(
  url: string,
  hintTeam1?: string,
  hintTeam2?: string,
  _allowUpcoming = true
): Promise<any | null> {
  try {
    const now = Date.now();
    if (!espnScoreboardCache.events.length) {
      try {
        const res = await axios.get("https://site.api.espn.com/apis/site/v2/sports/soccer/all/scoreboard?limit=500", {
          timeout: 4000
        });
        if (Array.isArray(res.data?.events)) {
          espnScoreboardCache = { time: Date.now(), events: res.data.events, refreshing: false };
        }
      } catch {}
    } else if (now - espnScoreboardCache.time > 500 && !espnScoreboardCache.refreshing) {
      espnScoreboardCache.refreshing = true;
      axios
        .get("https://site.api.espn.com/apis/site/v2/sports/soccer/all/scoreboard?limit=500", { timeout: 4000 })
        .then((res) => {
          if (Array.isArray(res.data?.events)) {
            espnScoreboardCache = { time: Date.now(), events: res.data.events, refreshing: false };
          } else {
            espnScoreboardCache.refreshing = false;
          }
        })
        .catch(() => {
          espnScoreboardCache.refreshing = false;
        });
    }

    if (!espnMultiDayCache.events.length || now - espnMultiDayCache.time > 45000) {
      try {
        const yest = formatEspnDateParam(new Date(now - 86400000));
        const today = formatEspnDateParam(new Date(now));
        const tom = formatEspnDateParam(new Date(now + 86400000));
        const [rYest, rToday, rTom] = await Promise.allSettled([
          axios.get(`https://site.api.espn.com/apis/site/v2/sports/soccer/all/scoreboard?limit=500&dates=${yest}`, { timeout: 5000 }),
          axios.get(`https://site.api.espn.com/apis/site/v2/sports/soccer/all/scoreboard?limit=500&dates=${today}`, { timeout: 5000 }),
          axios.get(`https://site.api.espn.com/apis/site/v2/sports/soccer/all/scoreboard?limit=500&dates=${tom}`, { timeout: 5000 })
        ]);
        const merged: any[] = [];
        for (const r of [rToday, rYest, rTom]) {
          if (r.status === "fulfilled" && Array.isArray(r.value.data?.events)) {
            merged.push(...r.value.data.events);
          }
        }
        if (merged.length > 0) {
          espnMultiDayCache = { time: now, events: merged };
        }
      } catch {}
    }

    const seenEventIds = new Set<string>();
    const events: any[] = [];
    for (const ev of [...espnScoreboardCache.events, ...espnMultiDayCache.events]) {
      if (ev && ev.id && !seenEventIds.has(String(ev.id))) {
        seenEventIds.add(String(ev.id));
        events.push(ev);
      }
    }

    if (!events || events.length === 0) return null;

    const { team1: extT1, team2: extT2, fromUrl } = extractTeamsFromFootballUrl(url);
    const cleanUrlLower = url
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();

    // Always prefer teams extracted from the URL itself so stale hintTeam1/hintTeam2 (like Real Madrid / Barcelona) never override a new URL!
    const isDefaultRealBarcaHint =
      /^(?:real\s*madrid|rma|barcelona|fc\s*barcelona|bar)$/i.test(String(hintTeam1 || "").trim()) &&
      /^(?:real\s*madrid|rma|barcelona|fc\s*barcelona|bar)$/i.test(String(hintTeam2 || "").trim()) &&
      !cleanUrlLower.includes("real-madrid") &&
      !cleanUrlLower.includes("barcelona");

    const effectiveHint1 = isDefaultRealBarcaHint ? "" : (hintTeam1 || "");
    const effectiveHint2 = isDefaultRealBarcaHint ? "" : (hintTeam2 || "");

    const t1Raw = (fromUrl ? extT1 : (effectiveHint1 && effectiveHint1 !== "Team 1" ? effectiveHint1 : extT1)).toLowerCase().trim();
    const t2Raw = (fromUrl ? extT2 : (effectiveHint2 && effectiveHint2 !== "Team 2" ? effectiveHint2 : extT2)).toLowerCase().trim();

    const normalizeTeam = (s: string) =>
      String(s || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/\b(?:fc|cf|sc|afc|ac|club|de|cd|ud|rcd|fk|nk|hnk|sk|bk|sporting)\b/g, "")
        .replace(/[^a-z0-9]/g, "")
        .trim();

    const n1 = normalizeTeam(t1Raw);
    const n2 = normalizeTeam(t2Raw);

    if ((!n1 || n1 === "team1") && (!n2 || n2 === "team2")) {
      return null;
    }

    const extractAgeTag = (s: string): string => {
      const m = String(s || "").toLowerCase().match(/\b(u17|u19|u20|u21|u23|women)\b/);
      return m ? m[1] : "";
    };
    const queryAgeTag = extractAgeTag(`${t1Raw} ${t2Raw} ${cleanUrlLower}`);

    const doesTeamMatch = (compTeam: any, targetNorm: string): boolean => {
      if (!targetNorm || targetNorm === "team1" || targetNorm === "team2" || targetNorm.length < 3) {
        return false;
      }
      const names = [
        compTeam?.displayName,
        compTeam?.shortDisplayName,
        compTeam?.name,
        compTeam?.location,
        compTeam?.abbreviation
      ]
        .filter(Boolean)
        .map((x: string) =>
          String(x)
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
        );

      for (const candidate of names) {
        const candAgeTag = extractAgeTag(candidate);
        if (queryAgeTag && candAgeTag && queryAgeTag !== candAgeTag) continue;
        if (!queryAgeTag && candAgeTag) continue;

        const normCand = normalizeTeam(candidate);
        if (!normCand || normCand.length < 3) continue;
        if (normCand === targetNorm || normCand.includes(targetNorm) || targetNorm.includes(normCand)) {
          return true;
        }
      }
      return false;
    };

    const matchingEvents: any[] = [];
    for (const ev of events) {
      const comp = ev.competitions?.[0];
      const competitors = comp?.competitors || [];
      if (competitors.length < 2) continue;

      const c0 = competitors[0]?.team;
      const c1 = competitors[1]?.team;

      const directMatch =
        (doesTeamMatch(c0, n1) && doesTeamMatch(c1, n2)) ||
        (doesTeamMatch(c0, n2) && doesTeamMatch(c1, n1));

      if (directMatch) {
        matchingEvents.push(ev);
      }
    }

    if (matchingEvents.length === 0) {
      // Fallback: search ESPN soccer teams directly so leagues not on the main scoreboard are also found!
      const candidateQueries = [t1Raw, t2Raw].filter(q => q && q !== "team 1" && q !== "team 2" && q.length >= 3);
      for (const queryTerm of candidateQueries) {
        if (matchingEvents.length > 0) break;
        try {
          const searchRes = await axios.get(
            `https://site.web.api.espn.com/apis/common/v3/search?query=${encodeURIComponent(queryTerm)}&limit=5&type=team`,
            { timeout: 4500 }
          );
          const soccerTeam = (searchRes.data?.items || []).find((it: any) => it.sport === "soccer" && it.id);
          if (soccerTeam?.id) {
            const teamRes = await axios.get(
              `https://site.api.espn.com/apis/site/v2/sports/soccer/all/teams/${soccerTeam.id}`,
              { timeout: 4500 }
            );
            const nextEvents = Array.isArray(teamRes.data?.team?.nextEvent) ? teamRes.data.team.nextEvent : [];
            for (const ne of nextEvents) {
              const comp = ne?.competitions?.[0];
              const competitors = comp?.competitors || [];
              if (competitors.length >= 2) {
                const c0 = competitors[0]?.team;
                const c1 = competitors[1]?.team;
                const directMatch =
                  (doesTeamMatch(c0, n1) && doesTeamMatch(c1, n2)) ||
                  (doesTeamMatch(c0, n2) && doesTeamMatch(c1, n1));
                if (directMatch) {
                  matchingEvents.push(ne);
                }
              }
            }
            if (matchingEvents.length === 0) {
              try {
                const [schedSettled, fixSettled] = await Promise.allSettled([
                  axios.get(
                    `https://site.api.espn.com/apis/site/v2/sports/soccer/all/teams/${soccerTeam.id}/schedule`,
                    { timeout: 4500 }
                  ),
                  axios.get(
                    `https://site.api.espn.com/apis/site/v2/sports/soccer/all/teams/${soccerTeam.id}/schedule?fixture=true`,
                    { timeout: 4500 }
                  )
                ]);
                const schedEvents: any[] = [];
                if (schedSettled.status === "fulfilled" && Array.isArray(schedSettled.value.data?.events)) {
                  schedEvents.push(...schedSettled.value.data.events);
                }
                if (fixSettled.status === "fulfilled" && Array.isArray(fixSettled.value.data?.events)) {
                  schedEvents.push(...fixSettled.value.data.events);
                }
                for (const se of schedEvents) {
                  const comp = se?.competitions?.[0];
                  const competitors = comp?.competitors || [];
                  if (competitors.length >= 2) {
                    const c0 = competitors[0]?.team;
                    const c1 = competitors[1]?.team;
                    const directMatch =
                      (doesTeamMatch(c0, n1) && doesTeamMatch(c1, n2)) ||
                      (doesTeamMatch(c0, n2) && doesTeamMatch(c1, n1));
                    if (directMatch) {
                      matchingEvents.push(se);
                    }
                  }
                }
              } catch {}
            }
          }
        } catch {}
      }
    }

    if (matchingEvents.length === 0) return null;

    // Prioritize LIVE ('in') matches first; otherwise choose the match closest in time (whether 'post' [finished] or 'pre' [upcoming])!
    const getEventState = (ev: any) =>
      String((ev.competitions?.[0]?.status || ev?.status)?.type?.state || "").toLowerCase();

    const sortedByCloseness = [...matchingEvents].sort((a, b) => {
      const da = a.date ? Math.abs(new Date(a.date).getTime() - now) : Number.MAX_SAFE_INTEGER;
      const db = b.date ? Math.abs(new Date(b.date).getTime() - now) : Number.MAX_SAFE_INTEGER;
      return da - db;
    });

    const matchedEvent =
      sortedByCloseness.find((ev) => getEventState(ev) === "in") ||
      sortedByCloseness[0];

    if (!matchedEvent) return null;

    const parseEspnCompScore = (compObj: any): number => {
      const raw = compObj?.score;
      if (raw === null || raw === undefined) return 0;
      if (typeof raw === "number") return Math.round(raw);
      if (typeof raw === "string") return parseInt(raw, 10) || 0;
      if (typeof raw === "object") {
        const v = raw.displayValue ?? raw.value;
        if (v !== undefined && v !== null) return parseInt(String(v), 10) || 0;
      }
      return 0;
    };

    const comp = matchedEvent.competitions?.[0];
    const competitors = comp?.competitors || [];
    const homeComp = competitors.find((c: any) => c.homeAway === "home") || competitors[0];
    const awayComp = competitors.find((c: any) => c.homeAway === "away") || competitors[1];

    const fTeam1 = homeComp?.team?.displayName || homeComp?.team?.name || "Home";
    const fTeam2 = awayComp?.team?.displayName || awayComp?.team?.name || "Away";
    let fScore1 = parseEspnCompScore(homeComp);
    let fScore2 = parseEspnCompScore(awayComp);

    const statusObj = comp?.status || matchedEvent?.status;
    const state = String(statusObj?.type?.state || "in").toLowerCase(); // 'pre', 'in', 'post'
    const shortDetail = String(statusObj?.type?.shortDetail || statusObj?.displayClock || "");
    const statusName = String(statusObj?.type?.name || "").toUpperCase();
    const periodNum = Number(statusObj?.period || 1);

    const isUpcoming = state === "pre";
    const isFinished = state === "post" || Boolean(statusObj?.type?.completed) || statusName.includes("FINAL") || statusName.includes("FULL_TIME");
    let fMinute = "Live";
    let fPeriod = "2H";

    if (isUpcoming) {
      fMinute = "Upcoming";
      fPeriod = "Not started";
    } else if (isFinished) {
      fMinute = "FT";
      fPeriod = "FT";
    } else if (statusName.includes("HALFTIME") || shortDetail.toUpperCase() === "HT") {
      fMinute = "HT";
      fPeriod = "HT";
    } else {
      fMinute = statusObj?.displayClock || shortDetail || (periodNum === 1 ? "1H" : "2H");
      fPeriod = periodNum === 1 ? "1H" : periodNum === 2 ? "2H" : "ET";
    }

    let matchStartTime: string | undefined = undefined;
    let matchStartTimeIso: string | undefined = undefined;
    if (matchedEvent.date) {
      const d = new Date(matchedEvent.date);
      if (!isNaN(d.getTime())) {
        matchStartTimeIso = d.toISOString();
        matchStartTime =
          d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) +
          ", " +
          d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true });
      }
    }

    const homeTeamId = homeComp?.team?.id || homeComp?.id;
    const details = Array.isArray(comp?.details) ? comp.details : [];
    let footballGoals = details
      .filter((d: any) => Boolean(d.scoringPlay))
      .map((d: any, idx: number) => ({
        id: `espn-goal-${idx}-${d.clock?.displayValue || idx}`,
        minute: formatGoalMinuteStr(d.clock?.displayValue),
        player: d.athletesInvolved?.[0]?.displayName || d.athletesInvolved?.[0]?.shortName || "Goal",
        team: String(d.team?.id) === String(homeTeamId) ? "team1" : "team2",
        isPenalty: Boolean(d.penaltyKick),
        isOwnGoal: Boolean(d.ownGoal)
      }));

    let footballCards = details
      .filter((d: any) => Boolean(d.yellowCard || d.redCard))
      .map((d: any, idx: number) => ({
        id: `espn-card-${idx}-${d.clock?.displayValue || idx}`,
        minute: formatGoalMinuteStr(d.clock?.displayValue),
        player: d.athletesInvolved?.[0]?.shortName || d.athletesInvolved?.[0]?.displayName || "Player",
        team: String(d.team?.id) === String(homeTeamId) ? "team1" : "team2",
        type: d.redCard ? "red" : "yellow"
      }));

    // If match is live/finished and comp.details wasn't populated (e.g. from team.nextEvent or schedule), fetch event summary!
    if (!isUpcoming && footballGoals.length === 0 && matchedEvent.id) {
      try {
        const sumRes = await axios.get(
          `https://site.api.espn.com/apis/site/v2/sports/soccer/all/summary?event=${matchedEvent.id}`,
          { timeout: 4500 }
        );
        const headerComp = sumRes.data?.header?.competitions?.[0];
        if (headerComp && Array.isArray(headerComp.competitors)) {
          const sumHome = headerComp.competitors.find((c: any) => c.homeAway === "home") || headerComp.competitors[0];
          const sumAway = headerComp.competitors.find((c: any) => c.homeAway === "away") || headerComp.competitors[1];
          if (sumHome?.score !== undefined) fScore1 = parseEspnCompScore(sumHome);
          if (sumAway?.score !== undefined) fScore2 = parseEspnCompScore(sumAway);
        }
        const keyEvents = Array.isArray(sumRes.data?.keyEvents) ? sumRes.data.keyEvents : [];
        footballGoals = keyEvents
          .filter((k: any) => Boolean(k.scoringPlay))
          .map((k: any, idx: number) => ({
            id: `espn-goal-sum-${idx}-${k.clock?.displayValue || idx}`,
            minute: formatGoalMinuteStr(k.clock?.displayValue),
            player: k.participants?.[0]?.athlete?.displayName || k.participants?.[0]?.athlete?.shortName || "Goal",
            team: String(k.team?.id) === String(homeTeamId) || normalizeTeam(k.team?.displayName) === normalizeTeam(fTeam1) ? "team1" : "team2",
            isPenalty: /penalty/i.test(String(k.text || k.type?.text || "")),
            isOwnGoal: /own\s*goal/i.test(String(k.text || k.type?.text || ""))
          }));
        if (footballCards.length === 0) {
          footballCards = keyEvents
            .filter((k: any) => /yellow\s*card|red\s*card/i.test(String(k.type?.text || k.text || "")))
            .map((k: any, idx: number) => ({
              id: `espn-card-sum-${idx}-${k.clock?.displayValue || idx}`,
              minute: formatGoalMinuteStr(k.clock?.displayValue),
              player: k.participants?.[0]?.athlete?.shortName || k.participants?.[0]?.athlete?.displayName || "Player",
              team: String(k.team?.id) === String(homeTeamId) || normalizeTeam(k.team?.displayName) === normalizeTeam(fTeam1) ? "team1" : "team2",
              type: /red\s*card/i.test(String(k.type?.text || k.text || "")) ? "red" : "yellow"
            }));
        }
      } catch {}
    }

    const getStat = (compObj: any, statName: string, fallback: number): number => {
      const st = (compObj?.statistics || []).find((s: any) => s.name === statName || s.abbreviation === statName);
      if (!st) return fallback;
      const val = Math.round(parseFloat(String(st.displayValue || "0")));
      return isNaN(val) ? fallback : val;
    };

    const p1 = getStat(homeComp, "possessionPct", 50);
    const p2 = getStat(awayComp, "possessionPct", 100 - p1);
    const yc1 = footballCards.filter((c: any) => c.team === "team1" && c.type === "yellow").length;
    const yc2 = footballCards.filter((c: any) => c.team === "team2" && c.type === "yellow").length;
    const rc1 = footballCards.filter((c: any) => c.team === "team1" && c.type === "red").length;
    const rc2 = footballCards.filter((c: any) => c.team === "team2" && c.type === "red").length;

    const footballStats = {
      possession: [p1, p2] as [number, number],
      shots: [getStat(homeComp, "totalShots", isUpcoming ? 0 : 10), getStat(awayComp, "totalShots", isUpcoming ? 0 : 10)] as [number, number],
      shotsOnTarget: [getStat(homeComp, "shotsOnTarget", isUpcoming ? 0 : 4), getStat(awayComp, "shotsOnTarget", isUpcoming ? 0 : 4)] as [number, number],
      corners: [getStat(homeComp, "wonCorners", isUpcoming ? 0 : 4), getStat(awayComp, "wonCorners", isUpcoming ? 0 : 4)] as [number, number],
      fouls: [getStat(homeComp, "foulsCommitted", isUpcoming ? 0 : 8), getStat(awayComp, "foulsCommitted", isUpcoming ? 0 : 8)] as [number, number],
      yellowCards: [yc1, yc2] as [number, number],
      redCards: [rc1, rc2] as [number, number],
      offsides: [getStat(homeComp, "offsides", 0), getStat(awayComp, "offsides", 0)] as [number, number]
    };

    const venueName = comp?.venue?.fullName || matchedEvent?.competitions?.[0]?.venue?.fullName || "Official Stadium";

    return {
      success: true,
      sport: "football",
      team1: fTeam1,
      team2: fTeam2,
      footballScore1: fScore1,
      footballScore2: fScore2,
      footballMinute: fMinute,
      footballPeriod: fPeriod,
      isUpcoming,
      matchStartTime,
      matchStartTimeIso,
      footballGoals,
      footballCards,
      footballStats,
      footballVenue: venueName,
      isFinished,
      statusText: isUpcoming
        ? `Match yet to begin${matchStartTime ? ` • Starts at ${matchStartTime}` : ""} (0 - 0)`
        : isFinished
        ? `Finished • Full Time (${fTeam1} ${fScore1} - ${fScore2} ${fTeam2})`
        : `${fPeriod} • ${fMinute} (${fTeam1} ${fScore1} - ${fScore2} ${fTeam2})`,
      lastUpdated: new Date().toLocaleTimeString()
    };
  } catch {
    return null;
  }
}

// Fetch real-time live, finished, and upcoming football match data from 365Scores API
// Covers Turkish Cup, lower divisions, regional cups, and global leagues not in ESPN!
async function tryFetch365ScoresSoccerMatch(
  url: string,
  hintTeam1?: string,
  hintTeam2?: string
): Promise<any | null> {
  try {
    const ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";
    const now = Date.now();

    if (!scores365AllGamesCache.games.length || now - scores365AllGamesCache.time > 2500) {
      try {
        const res = await axios.get(
          "https://webws.365scores.com/web/games/allscores/?appTypeId=5&langId=1&timezoneName=UTC&userCountryId=1&sports=1",
          { headers: { "User-Agent": ua }, timeout: 3800 }
        );
        if (Array.isArray(res.data?.games)) {
          scores365AllGamesCache = { time: Date.now(), games: res.data.games, refreshing: false };
        }
      } catch {}
    }

    const { team1: extT1, team2: extT2, fromUrl } = extractTeamsFromFootballUrl(url);
    const isValidHint = (s?: string) =>
      Boolean(s && !/^(?:team\s*[12ab]|টিম\s*[এবি১২12]|home|away|t[12])$/i.test(s.trim()));

    const cleanAscii = (s: string) =>
      String(s || "")
        .replace(/[ıİ]/g, "i")
        .replace(/[ğĞ]/g, "g")
        .replace(/[üÜ]/g, "u")
        .replace(/[şŞ]/g, "s")
        .replace(/[öÖ]/g, "o")
        .replace(/[çÇ]/g, "c")
        .replace(/ß/g, "ss")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();

    const cleanUrlAscii = cleanAscii(url);
    const h1 = isValidHint(hintTeam1) ? hintTeam1!.trim() : "";
    const h2 = isValidHint(hintTeam2) ? hintTeam2!.trim() : "";

    // Prefer hintTeam1 & hintTeam2 when they match the URL or when URL split might be ambiguous
    const hintMatchesUrl =
      h1 &&
      h2 &&
      (cleanUrlAscii.includes(cleanAscii(h1).replace(/[^a-z0-9]/g, "").slice(0, 4)) ||
        cleanUrlAscii.includes(cleanAscii(h2).replace(/[^a-z0-9]/g, "").slice(0, 4)));

    const targetT1Raw = hintMatchesUrl ? h1 : (fromUrl && extT1 !== "Team 1" ? extT1 : (h1 || extT1));
    const targetT2Raw = hintMatchesUrl ? h2 : (fromUrl && extT2 !== "Team 2" ? extT2 : (h2 || extT2));

    const normalizeFull = (s: string) =>
      cleanAscii(s)
        .replace(/\b(?:fc|cf|sc|afc|ac|club|de|cd|ud|rcd|fk|nk|hnk|sk|bk|as|fsk|sporting)\b/g, "")
        .replace(/[^a-z0-9]/g, "")
        .trim();

    const normalizeRoot = (s: string) =>
      cleanAscii(s)
        .replace(/\b(?:fc|cf|sc|afc|ac|club|de|cd|ud|rcd|fk|nk|hnk|sk|bk|as|fsk|sporting|spor|belediyespor|belediye|fatih|alanya|1221|1922|1923|1928|36|04|96)\b/g, " ")
        .replace(/(?:belediyespor|spor)$/g, "")
        .replace(/[^a-z0-9]/g, "")
        .trim();

    // Known club rename/alias equivalents (e.g. Alanya 1221 FSK = formerly Alanya Kestelspor / Kestelspor; Kars 36 Spor = Karsspor)
    const getTeamAliases = (raw: string): string[] => {
      const ascii = cleanAscii(raw);
      const aliases = new Set<string>();
      const nf = normalizeFull(raw);
      const nr = normalizeRoot(raw);
      if (nf) aliases.add(nf);
      if (nr && nr.length >= 3) aliases.add(nr);
      if (ascii.includes("alanya") || ascii.includes("1221") || ascii.includes("kestel")) {
        aliases.add("alanya1221");
        aliases.add("kestelspor");
        aliases.add("alanyakestelspor");
        aliases.add("kestel");
      }
      if (ascii.includes("kars")) {
        aliases.add("kars36spor");
        aliases.add("karsspor");
        aliases.add("kars");
      }
      if (ascii.includes("karagumruk")) {
        aliases.add("fatihkaragumruk");
        aliases.add("karagumruk");
      }
      return [...aliases];
    };

    const aliases1 = getTeamAliases(targetT1Raw);
    const aliases2 = getTeamAliases(targetT2Raw);
    if (aliases1.length === 0 && aliases2.length === 0) return null;

    const extractAgeTag = (s: string): string => {
      const m = cleanAscii(s).match(/\b(u17|u19|u20|u21|u23|women)\b|\((w)\)/);
      return m ? (m[1] || "women") : "";
    };
    const queryAgeTag = extractAgeTag(`${targetT1Raw} ${targetT2Raw} ${url}`);

    const doesCompMatchAliases = (comp: any, targetAliases: string[]): boolean => {
      if (!comp || targetAliases.length === 0) return false;
      const candNames = [comp.name, comp.shortName, comp.symbolicName, comp.nameForURL].filter(Boolean);
      for (const cn of candNames) {
        const candTag = extractAgeTag(cn);
        if (queryAgeTag && candTag && queryAgeTag !== candTag) continue;
        if (!queryAgeTag && candTag) continue;
        const candAliases = getTeamAliases(cn);
        for (const ca of candAliases) {
          if (ca.length < 3) continue;
          for (const ta of targetAliases) {
            if (ta.length < 3) continue;
            if (ca === ta || (ca.length >= 4 && ta.length >= 4 && (ca.includes(ta) || ta.includes(ca)))) {
              return true;
            }
          }
        }
      }
      return false;
    };

    let candidateGames: any[] = [...scores365AllGamesCache.games];

    const findMatchingGame = (gamesList: any[]) => {
      const bothMatched: any[] = [];
      const singleLiveOrTodayMatched: any[] = [];
      for (const g of gamesList) {
        if (!g || !g.homeCompetitor || !g.awayCompetitor) continue;
        const hMatch1 = doesCompMatchAliases(g.homeCompetitor, aliases1);
        const aMatch2 = doesCompMatchAliases(g.awayCompetitor, aliases2);
        const hMatch2 = doesCompMatchAliases(g.homeCompetitor, aliases2);
        const aMatch1 = doesCompMatchAliases(g.awayCompetitor, aliases1);

        if ((hMatch1 && aMatch2) || (hMatch2 && aMatch1)) {
          bothMatched.push(g);
        } else if (hMatch1 || aMatch2 || hMatch2 || aMatch1) {
          const startMs = g.startTime ? new Date(g.startTime).getTime() : 0;
          if (g.statusGroup === 3 || (startMs && Math.abs(startMs - now) <= 36 * 3600 * 1000)) {
            singleLiveOrTodayMatched.push(g);
          }
        }
      }
      if (bothMatched.length > 0) {
        const liveGame = bothMatched.find((g) => g.statusGroup === 3);
        if (liveGame) return liveGame;
        const sortedByCloseness = [...bothMatched].sort((a, b) => {
          const da = a.startTime ? Math.abs(new Date(a.startTime).getTime() - now) : Number.MAX_SAFE_INTEGER;
          const db = b.startTime ? Math.abs(new Date(b.startTime).getTime() - now) : Number.MAX_SAFE_INTEGER;
          return da - db;
        });
        return sortedByCloseness[0];
      }
      if (singleLiveOrTodayMatched.length === 1) {
        return singleLiveOrTodayMatched[0];
      }
      return null;
    };

    let matchedGame = findMatchingGame(candidateGames);

    // If not in allscores, search 365Scores competitors directly across current, results, and fixtures endpoints!
    if (!matchedGame) {
      const build365SearchQueries = (raw: string): string[] => {
        const clean = String(raw || "").trim();
        if (!clean || clean === "Team 1" || clean === "Team 2" || clean.length < 3) return [];
        const qs = new Set<string>([clean]);
        const ascii = cleanAscii(clean);
        if (ascii.includes("kars")) qs.add("Karsspor");
        if (ascii.includes("alanya") && (ascii.includes("1221") || ascii.includes("kestel") || ascii.includes("fsk") || ascii.includes("fk"))) {
          qs.add("Kestelspor");
        }
        if (ascii.includes("karagumruk")) qs.add("Fatih Karagumruk");
        if (ascii.includes("istanbulspor")) qs.add("Istanbulspor");
        const stripped = clean
          .replace(/\b(?:FC|CF|SC|FK|SK|FSK|AS|AC|1221|36)\b/gi, "")
          .replace(/\s+/g, " ")
          .trim();
        if (stripped.length >= 3) qs.add(stripped);
        return [...qs];
      };

      const searchTerms = [...new Set([...build365SearchQueries(targetT1Raw), ...build365SearchQueries(targetT2Raw)])];
      const gatheredGames: any[] = [];
      const seenGameIds = new Set<number>();

      await Promise.allSettled(
        searchTerms.map(async (term) => {
          const cacheKey = cleanAscii(term);
          const cachedSearch = scores365SearchCache.get(cacheKey);
          if (cachedSearch && now - cachedSearch.time < 60000) {
            for (const g of cachedSearch.games) {
              if (g?.id && !seenGameIds.has(Number(g.id))) {
                seenGameIds.add(Number(g.id));
                gatheredGames.push(g);
              }
            }
            return;
          }
          try {
            const sRes = await axios.get(
              `https://webws.365scores.com/web/search/?appTypeId=5&langId=1&timezoneName=UTC&userCountryId=1&query=${encodeURIComponent(term)}`,
              { headers: { "User-Agent": ua }, timeout: 3500 }
            );
            const soccerComp = (sRes.data?.competitors || []).find(
              (c: any) => c.sportId === 1 && (!queryAgeTag ? !extractAgeTag(c.name) : extractAgeTag(c.name) === queryAgeTag)
            );
            if (soccerComp?.id) {
              const [rCur, rRes, rFix] = await Promise.allSettled([
                axios.get(
                  `https://webws.365scores.com/web/games/current/?appTypeId=5&langId=1&timezoneName=UTC&userCountryId=1&competitors=${soccerComp.id}`,
                  { headers: { "User-Agent": ua }, timeout: 3500 }
                ),
                axios.get(
                  `https://webws.365scores.com/web/games/results/?appTypeId=5&langId=1&timezoneName=UTC&userCountryId=1&competitors=${soccerComp.id}`,
                  { headers: { "User-Agent": ua }, timeout: 3500 }
                ),
                axios.get(
                  `https://webws.365scores.com/web/games/fixtures/?appTypeId=5&langId=1&timezoneName=UTC&userCountryId=1&competitors=${soccerComp.id}`,
                  { headers: { "User-Agent": ua }, timeout: 3500 }
                )
              ]);
              const compGames: any[] = [];
              for (const r of [rCur, rRes, rFix]) {
                if (r.status === "fulfilled" && Array.isArray(r.value.data?.games)) {
                  compGames.push(...r.value.data.games);
                }
              }
              scores365SearchCache.set(cacheKey, { time: now, games: compGames });
              for (const g of compGames) {
                if (g?.id && !seenGameIds.has(Number(g.id))) {
                  seenGameIds.add(Number(g.id));
                  gatheredGames.push(g);
                }
              }
            }
          } catch {}
        })
      );

      if (gatheredGames.length > 0) {
        matchedGame = findMatchingGame(gatheredGames);
      }
    }

    if (!matchedGame) return null;

    // Fetch detailed game object (for events/goals/cards/venue) with 2.5s cache
    let detailedGame = matchedGame;
    const gameId = Number(matchedGame.id);
    if (gameId) {
      const cachedDetail = scores365GameDetailCache.get(gameId);
      if (cachedDetail && now - cachedDetail.time < 2500) {
        detailedGame = cachedDetail.game;
      } else {
        try {
          const dRes = await axios.get(
            `https://webws.365scores.com/web/game/?appTypeId=5&langId=1&timezoneName=UTC&userCountryId=1&gameId=${gameId}`,
            { headers: { "User-Agent": ua }, timeout: 3200 }
          );
          if (dRes.data?.game) {
            detailedGame = dRes.data.game;
            scores365GameDetailCache.set(gameId, { time: now, game: detailedGame });
          }
        } catch {}
      }
    }

    const homeComp = detailedGame.homeCompetitor || matchedGame.homeCompetitor;
    const awayComp = detailedGame.awayCompetitor || matchedGame.awayCompetitor;

    // Preserve user/Sofascore display team names if they match in order so Bet Slip <-> Scorer sync stays 100% locked
    const homeMatchesT1 = doesCompMatchAliases(homeComp, aliases1);
    const awayMatchesT1 = doesCompMatchAliases(awayComp, aliases1);
    let fTeam1 = homeComp?.name || "Home";
    let fTeam2 = awayComp?.name || "Away";
    if (homeMatchesT1 && isValidHint(targetT1Raw) && isValidHint(targetT2Raw)) {
      fTeam1 = targetT1Raw;
      fTeam2 = targetT2Raw;
    } else if (awayMatchesT1 && isValidHint(targetT1Raw) && isValidHint(targetT2Raw)) {
      fTeam1 = targetT2Raw;
      fTeam2 = targetT1Raw;
    }

    const rawS1 = Number(homeComp?.score);
    const rawS2 = Number(awayComp?.score);
    const fScore1 = !isNaN(rawS1) && rawS1 >= 0 ? Math.round(rawS1) : 0;
    const fScore2 = !isNaN(rawS2) && rawS2 >= 0 ? Math.round(rawS2) : 0;

    const statusGroup = Number(detailedGame.statusGroup || matchedGame.statusGroup || 3); // 2=Upcoming, 3=Live, 4=Finished
    const statusTextRaw = String(detailedGame.statusText || matchedGame.statusText || "");
    const shortStatusRaw = String(detailedGame.shortStatusText || matchedGame.shortStatusText || "");
    const gameTimeNum = Math.round(Number(detailedGame.gameTime ?? matchedGame.gameTime ?? 0));
    const gameTimeDisp = String(detailedGame.gameTimeDisplay || matchedGame.gameTimeDisplay || "").trim();

    const isUpcoming = statusGroup === 2 || /scheduled|not\s*started/i.test(statusTextRaw);
    const isFinished =
      statusGroup === 4 ||
      Boolean(detailedGame.justEnded) ||
      /^(?:ended|final|ft|full\s*time|after\s*penalties|aet)$/i.test(statusTextRaw.trim()) ||
      /^(?:ft|ended|aet|pen)$/i.test(shortStatusRaw.trim());
    const isHalftime =
      !isUpcoming &&
      !isFinished &&
      (/half\s*time|^ht$/i.test(statusTextRaw.trim()) || /^ht$/i.test(shortStatusRaw.trim()));

    let fMinute = "Live";
    let fPeriod = "1H";
    if (isUpcoming) {
      fMinute = "Upcoming";
      fPeriod = "Not started";
    } else if (isFinished) {
      fMinute = "FT";
      fPeriod = "FT";
    } else if (isHalftime) {
      fMinute = "HT";
      fPeriod = "HT";
    } else {
      fMinute = gameTimeDisp ? (gameTimeDisp.endsWith("'") ? gameTimeDisp : `${gameTimeDisp}'`) : (gameTimeNum > 0 ? `${gameTimeNum}'` : "Live");
      fPeriod = /2nd|second/i.test(statusTextRaw) || gameTimeNum > 45 ? "2H" : "1H";
    }

    let matchStartTime: string | undefined = undefined;
    let matchStartTimeIso: string | undefined = undefined;
    if (detailedGame.startTime) {
      const d = new Date(detailedGame.startTime);
      if (!isNaN(d.getTime())) {
        matchStartTimeIso = d.toISOString();
        matchStartTime =
          d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) +
          ", " +
          d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true });
      }
    }

    const memberMap = new Map<number, string>();
    for (const mem of Array.isArray(detailedGame.members) ? detailedGame.members : []) {
      if (mem?.id && mem?.name) {
        memberMap.set(Number(mem.id), String(mem.name));
      }
    }

    const homeCompId = Number(homeComp?.id);
    const rawEvents = Array.isArray(detailedGame.events) ? detailedGame.events : [];

    const footballGoals = rawEvents
      .filter((ev: any) => ev?.eventType?.id === 1 || /goal/i.test(String(ev?.eventType?.name || "")))
      .map((ev: any, idx: number) => {
        const minStr = ev.addedTime
          ? `${ev.gameTime}+${ev.addedTime}'`
          : ev.gameTimeDisplay || `${ev.gameTime || 45}'`;
        const player = memberMap.get(Number(ev.playerId)) || "Goal";
        const subName = String(ev?.eventType?.subTypeName || "");
        return {
          id: `365-goal-${gameId}-${idx}-${minStr}`,
          minute: minStr,
          player,
          team: Number(ev.competitorId) === homeCompId ? "team1" : "team2",
          isPenalty: /penalty/i.test(subName),
          isOwnGoal: /own\s*goal/i.test(subName)
        };
      });

    const footballCards = rawEvents
      .filter((ev: any) => /card/i.test(String(ev?.eventType?.name || "")))
      .map((ev: any, idx: number) => {
        const minStr = ev.addedTime
          ? `${ev.gameTime}+${ev.addedTime}'`
          : ev.gameTimeDisplay || `${ev.gameTime || 45}'`;
        const player = memberMap.get(Number(ev.playerId)) || "Player";
        const evName = String(ev?.eventType?.name || "");
        return {
          id: `365-card-${gameId}-${idx}-${minStr}`,
          minute: minStr,
          player,
          team: Number(ev.competitorId) === homeCompId ? "team1" : "team2",
          type: /red/i.test(evName) ? "red" : "yellow"
        };
      });

    const yc1 = footballCards.filter((c: any) => c.team === "team1" && c.type === "yellow").length;
    const yc2 = footballCards.filter((c: any) => c.team === "team2" && c.type === "yellow").length;
    const rc1 = footballCards.filter((c: any) => c.team === "team1" && c.type === "red").length;
    const rc2 = footballCards.filter((c: any) => c.team === "team2" && c.type === "red").length;

    const venueName =
      detailedGame.venue?.name ||
      detailedGame.competitionDisplayName ||
      matchedGame.competitionDisplayName ||
      "Official Stadium";

    return {
      success: true,
      sport: "football",
      team1: fTeam1,
      team2: fTeam2,
      footballScore1: fScore1,
      footballScore2: fScore2,
      footballMinute: fMinute,
      footballPeriod: fPeriod,
      isUpcoming,
      isFinished,
      matchStartTime,
      matchStartTimeIso,
      footballGoals,
      footballCards,
      footballStats: {
        possession: [50, 50] as [number, number],
        shots: [isUpcoming ? 0 : Math.max(fScore1 * 3, 4), isUpcoming ? 0 : Math.max(fScore2 * 3, 3)] as [number, number],
        shotsOnTarget: [isUpcoming ? 0 : Math.max(fScore1, 2), isUpcoming ? 0 : Math.max(fScore2, 1)] as [number, number],
        corners: [isUpcoming ? 0 : 4, isUpcoming ? 0 : 3] as [number, number],
        fouls: [isUpcoming ? 0 : 6, isUpcoming ? 0 : 6] as [number, number],
        yellowCards: [yc1, yc2] as [number, number],
        redCards: [rc1, rc2] as [number, number],
        offsides: [0, 0] as [number, number]
      },
      footballVenue: venueName,
      statusText: isUpcoming
        ? `Match yet to begin${matchStartTime ? ` • Starts at ${matchStartTime}` : ""} (0 - 0)`
        : isFinished
        ? `Finished • Full Time (${fTeam1} ${fScore1} - ${fScore2} ${fTeam2})`
        : `${fPeriod} • ${fMinute} (${fTeam1} ${fScore1} - ${fScore2} ${fTeam2})`,
      lastUpdated: new Date().toLocaleTimeString()
    };
  } catch {
    return null;
  }
}

// Try Sofascore public API if an event ID is present in the URL (e.g. #id:12437535)
async function tryFetchSofascoreEventApi(url: string): Promise<any | null> {
  const idMatch = url.match(/(?:#id:|\/event\/|[?&]id=|\/)(\d{7,10})\b/i);
  if (!idMatch || !idMatch[1]) return null;
  const eventId = idMatch[1];

  try {
    const sfHeaders = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
      "Accept": "application/json",
      "Origin": "https://www.sofascore.com",
      "Referer": "https://www.sofascore.com/"
    };
    const [apiSettled, incSettled] = await Promise.allSettled([
      axios.get(`https://api.sofascore.com/api/v1/event/${eventId}`, {
        headers: sfHeaders,
        timeout: 3500
      }),
      axios.get(`https://api.sofascore.com/api/v1/event/${eventId}/incidents`, {
        headers: sfHeaders,
        timeout: 3000
      })
    ]);

    if (apiSettled.status !== "fulfilled") return null;
    const apiRes = apiSettled.value;

    const ev = apiRes.data?.event;
    if (!ev) return null;

    const sportSlug = ev.tournament?.category?.sport?.slug || "football";
    if (sportSlug === "cricket") return null; // Let cricket parser handle cricket events

    const fTeam1 = ev.homeTeam?.name || ev.homeTeam?.shortName || "Home";
    const fTeam2 = ev.awayTeam?.name || ev.awayTeam?.shortName || "Away";
    const fScore1 = ev.homeScore?.current ?? ev.homeScore?.display ?? 0;
    const fScore2 = ev.awayScore?.current ?? ev.awayScore?.display ?? 0;
    const statusType = (ev.status?.type || "").toLowerCase(); // 'inprogress', 'finished', 'notstarted'
    const statusDesc = ev.status?.description || "";

    const isUpcoming = statusType === "notstarted" || statusDesc.toLowerCase().includes("not started");
    let fMinute = "Live";
    let fPeriod = "2H";
    let matchStartTime: string | undefined = undefined;
    let matchStartTimeIso: string | undefined = undefined;

    if (ev.startTimestamp) {
      const startD = new Date(ev.startTimestamp * 1000);
      if (!isNaN(startD.getTime())) {
        matchStartTimeIso = startD.toISOString();
        matchStartTime =
          startD.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) +
          ", " +
          startD.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true });
      }
    }

    if (isUpcoming) {
      fMinute = "Upcoming";
      fPeriod = "Not started";
    } else if (statusType === "finished" || statusDesc.toLowerCase() === "ended" || statusDesc.toLowerCase() === "ft") {
      fMinute = "FT";
      fPeriod = "FT";
    } else if (statusDesc.toLowerCase() === "halftime" || statusDesc.toLowerCase() === "ht") {
      fMinute = "HT";
      fPeriod = "HT";
    } else if (ev.time?.currentPeriodStartTimestamp) {
      const elapsedSec = Math.max(0, Math.floor(Date.now() / 1000) - ev.time.currentPeriodStartTimestamp);
      const baseMin = ev.time?.initial ? Math.floor(ev.time.initial / 60) : (statusDesc.includes("2nd") ? 45 : 0);
      const curMin = Math.min(120, baseMin + Math.floor(elapsedSec / 60) + 1);
      fMinute = `${curMin}'`;
      fPeriod = curMin > 45 || statusDesc.includes("2nd") ? "2H" : "1H";
    } else if (statusDesc) {
      fMinute = statusDesc;
      fPeriod = statusDesc.includes("1st") ? "1H" : "2H";
    }

    const isEvFinished = statusType === "finished" || statusDesc.toLowerCase() === "ended" || statusDesc.toLowerCase() === "ft";

    let footballGoals: any[] = [];
    let footballCards: any[] = [];
    if (!isUpcoming && incSettled.status === "fulfilled") {
      try {
        const incidents = Array.isArray(incSettled.value.data?.incidents) ? incSettled.value.data.incidents : [];
        footballGoals = incidents
          .filter((inc: any) => inc.incidentType === "goal")
          .map((inc: any, idx: number) => ({
            id: `sf-goal-${inc.id || idx}`,
            minute: inc.addedTime ? `${inc.time}+${inc.addedTime}'` : `${inc.time || 45}'`,
            player: inc.player?.name || inc.player?.shortName || "Goal",
            team: inc.isHome ? "team1" : "team2",
            isPenalty: inc.incidentClass === "penalty",
            isOwnGoal: inc.incidentClass === "ownGoal"
          }));
        footballCards = incidents
          .filter((inc: any) => inc.incidentType === "card")
          .map((inc: any, idx: number) => ({
            id: `sf-card-${inc.id || idx}`,
            minute: inc.addedTime ? `${inc.time}+${inc.addedTime}'` : `${inc.time || 45}'`,
            player: inc.player?.shortName || inc.player?.name || "Player",
            team: inc.isHome ? "team1" : "team2",
            type: inc.incidentClass === "red" || inc.incidentClass === "yellowRed" ? "red" : "yellow"
          }));
      } catch {}
    }

    return {
      success: true,
      sport: "football",
      team1: fTeam1,
      team2: fTeam2,
      footballScore1: fScore1,
      footballScore2: fScore2,
      footballMinute: fMinute,
      footballPeriod: fPeriod,
      isUpcoming,
      isFinished: isEvFinished,
      matchStartTime,
      matchStartTimeIso,
      footballGoals,
      footballCards,
      footballVenue: ev.venue?.stadium?.name || ev.venue?.name || ev.tournament?.name || "Official Stadium",
      statusText: isUpcoming
        ? `Match yet to begin${matchStartTime ? ` • Starts at ${matchStartTime}` : ""} (0 - 0)`
        : isEvFinished
          ? `Finished • Full Time (${fTeam1} ${fScore1} - ${fScore2} ${fTeam2})`
          : `${fPeriod} • ${fMinute} (${fTeam1} ${fScore1} - ${fScore2} ${fTeam2})`,
      lastUpdated: new Date().toLocaleTimeString()
    };
  } catch {
    return null;
  }
}

// Fallback for Sofascore / Football matches not in ESPN (e.g. Turkish Cup Kars 36 Spor vs Fatsa Belediyespor)
async function tryFetchFootballViaWebSearch(
  url: string,
  hintTeam1?: string,
  hintTeam2?: string
): Promise<any | null> {
  try {
    const cacheKey = `${url.trim()}|${hintTeam1 || ""}|${hintTeam2 || ""}`;
    const cachedWeb = footballWebSearchCache.get(cacheKey);
    if (cachedWeb && Date.now() - cachedWeb.time < 60000) {
      return cachedWeb.result;
    }

    const { team1: extT1, team2: extT2 } = extractTeamsFromFootballUrl(url);
    const tokens = new Set<string>();
    for (const part of [extT1, extT2, hintTeam1, hintTeam2]) {
      const clean = String(part || "").trim();
      if (clean && !/^(?:team\s*[12ab]|টিম\s*[এবি১২12]|home|away)$/i.test(clean)) {
        tokens.add(clean);
      }
    }
    const rawParts = [...tokens].join(" ").replace(/\s+/g, " ").trim();
    if (!rawParts || rawParts.length < 3) return null;

    const runDdgQuery = async (q: string) => {
      const ddgRes = await axios.get(
        `https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}`,
        {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"
          },
          timeout: 4500
        }
      );
      const html = String(ddgRes.data || "");
      const titles = [...html.matchAll(/<a[^>]*class="result__a"[^>]*>([\s\S]*?)<\/a>/gi)].map(m =>
        m[1].replace(/<[^>]*>/g, "").replace(/&#x27;/g, "'").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim()
      );
      const snippets = [...html.matchAll(/<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi)].map(m =>
        m[1].replace(/<[^>]*>/g, "").replace(/&#x27;/g, "'").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim()
      );
      return { titles, snippets };
    };

    let { titles: titleMatches, snippets: snippetMatches } = await runDdgQuery(
      `sofascore ${rawParts} "live score starts on"`
    );

    const parseStartFromSnippets = (snips: string[]) => {
      for (const snip of snips) {
        const m1 = snip.match(/starts\s+on\s+(\d{1,2}\s+[A-Za-z]+\s+\d{4})\s+at\s+(\d{1,2}:\d{2}(?::\d{2})?)\s*UTC/i);
        const m2 = snip.match(/\bon\s+(?:[A-Za-z]{3,9},\s+)?([A-Za-z]+\s+\d{1,2},?\s+\d{4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AP]M)?)\s*UTC/i);
        const datePart = m1?.[1] || m2?.[1];
        const timePart = m1?.[2] || m2?.[2];
        if (datePart && timePart) {
          const d = new Date(`${datePart} ${timePart} UTC`);
          if (!isNaN(d.getTime())) return d;
        }
      }
      return null;
    };

    let parsedDate = parseStartFromSnippets(snippetMatches);
    if (!parsedDate) {
      const retry = await runDdgQuery(`"${rawParts}" sofascore`);
      titleMatches = [...titleMatches, ...retry.titles];
      snippetMatches = [...snippetMatches, ...retry.snippets];
      parsedDate = parseStartFromSnippets(snippetMatches);
    }

    if (!parsedDate) {
      footballWebSearchCache.set(cacheKey, { time: Date.now(), result: null });
      return null;
    }

    const hasValidHint1 = Boolean(hintTeam1 && !/^(?:team\s*[12ab]|টিম\s*[এবি১২12]|t[12])$/i.test(hintTeam1.trim()));
    const hasValidHint2 = Boolean(hintTeam2 && !/^(?:team\s*[12ab]|টিম\s*[এবি১২12]|t[12])$/i.test(hintTeam2.trim()));
    let fTeam1 = hasValidHint1 ? hintTeam1!.trim() : (extT1 !== "Team 1" ? extT1 : "Team 1");
    let fTeam2 = hasValidHint2 ? hintTeam2!.trim() : (extT2 !== "Team 2" ? extT2 : "Team 2");

    if (!hasValidHint1 || !hasValidHint2) {
      for (const t of titleMatches) {
        const vsM = t.match(/^(.+?)\s+(?:vs\.?|v)\s+(.+?)\s+(?:live\s+score|live|H2H|\||-)/i);
        if (vsM && vsM[1] && vsM[2]) {
          fTeam1 = vsM[1].trim();
          fTeam2 = vsM[2].trim();
          break;
        }
      }
    }

    const matchStartTimeIso = parsedDate.toISOString();
    const matchStartTime =
      parsedDate.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) +
      ", " +
      parsedDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true });

    const startMs = parsedDate.getTime();
    const isUpcoming = startMs > Date.now() - 5 * 60 * 1000;
    const isFinished = !isUpcoming && Date.now() - startMs > 125 * 60 * 1000;

    const webRes = {
      success: true,
      sport: "football",
      team1: fTeam1,
      team2: fTeam2,
      footballScore1: 0,
      footballScore2: 0,
      footballMinute: isUpcoming ? "Upcoming" : isFinished ? "FT" : "Live",
      footballPeriod: isUpcoming ? "Not started" : isFinished ? "FT" : "1H",
      isUpcoming,
      isFinished,
      matchStartTime,
      matchStartTimeIso,
      footballGoals: [],
      footballCards: [],
      footballStats: {
        possession: [50, 50],
        shots: [0, 0],
        shotsOnTarget: [0, 0],
        corners: [0, 0],
        fouls: [0, 0],
        yellowCards: [0, 0],
        redCards: [0, 0],
        offsides: [0, 0]
      },
      footballVenue: "Official Stadium",
      statusText: isUpcoming
        ? `Match yet to begin • Starts at ${matchStartTime}`
        : isFinished
          ? `Full Time • ${fTeam1} vs ${fTeam2}`
          : `1H • Live (${fTeam1} 0 - 0 ${fTeam2})`,
      lastUpdated: new Date().toLocaleTimeString()
    };
    footballWebSearchCache.set(cacheKey, { time: Date.now(), result: webRes });
    return webRes;
  } catch {
    return null;
  }
}

// Live Match Parser (Supports both Cricket and Sofascore / Football in their distinct native formats!)
async function parseLiveCricketUrl(
  url: string,
  hintTeam1?: string,
  hintTeam2?: string,
  hintSport?: string,
  forceFresh = false
) {
  if (!url || typeof url !== "string") {
    throw new Error("Valid match URL is required");
  }

  let cleanUrl = url.trim();
  for (let i = 0; i < 2; i++) {
    try {
      const parsed = new URL(cleanUrl);
      const host = parsed.hostname.toLowerCase();
      const pathname = parsed.pathname.toLowerCase();
      if (
        ((host.includes("google.") || host.includes("bing.") || host.includes("yahoo.")) &&
          (pathname === "/url" || pathname.startsWith("/url/"))) ||
        (host.includes("facebook.com") && pathname === "/l.php")
      ) {
        const targetParam =
          parsed.searchParams.get("url") ||
          parsed.searchParams.get("q") ||
          parsed.searchParams.get("u") ||
          parsed.searchParams.get("target");
        if (targetParam && /^https?:\/\//i.test(targetParam.trim())) {
          cleanUrl = targetParam.trim();
          continue;
        }
        throw new Error("Incomplete redirect URL (missing target match link)");
      }
    } catch (e: any) {
      if (e?.message?.includes("Incomplete redirect URL")) throw e;
    }
    break;
  }

  // Register real external URLs in activeHotPolledUrls so the server background loop keeps them continuously warm
  if (/^https?:\/\//i.test(cleanUrl)) {
    const existingWatch = activeHotPolledUrls.get(cleanUrl);
    if (existingWatch) {
      existingWatch.lastRequestedAt = Date.now();
      if (hintTeam1) existingWatch.team1 = hintTeam1;
      if (hintTeam2) existingWatch.team2 = hintTeam2;
      if (hintSport) existingWatch.sport = hintSport;
    } else {
      activeHotPolledUrls.set(cleanUrl, {
        url: cleanUrl,
        team1: hintTeam1,
        team2: hintTeam2,
        sport: hintSport,
        lastRequestedAt: Date.now(),
        isFetching: false,
        lastSignature: ""
      });
    }
  }

  const matchedKey = resolveMatchKey(cleanUrl);
  const isDemo = cleanUrl.startsWith("demo://") || cleanUrl.startsWith("test://") || cleanUrl.startsWith("sofascore://") || Boolean(matchedKey);
  const cacheTtl = isDemo ? 350 : 2500;
  const cached = liveUrlScrapeCache.get(cleanUrl);
  if (!forceFresh && cached && !cached.result?.isFallback && Date.now() - cached.time < cacheTtl) {
    return cached.result;
  }

  // Coalesce concurrent requests for the same URL so simultaneous polls share a single in-flight promise
  const existingPromise = inFlightLiveUrlPromises.get(cleanUrl);
  if (existingPromise) {
    return existingPromise;
  }

  const fetchPromise = parseLiveCricketUrlCore(cleanUrl, hintTeam1, hintTeam2, hintSport, cached, matchedKey, isDemo);
  inFlightLiveUrlPromises.set(cleanUrl, fetchPromise);

  try {
    const result = await fetchPromise;
    const watchEntry = activeHotPolledUrls.get(cleanUrl);
    if (watchEntry && result) {
      const sig = computeLiveResultSignature(result);
      if (sig && sig !== watchEntry.lastSignature) {
        watchEntry.lastSignature = sig;
        broadcastLiveMatchSse(cleanUrl, result);
      }
    }
    return result;
  } finally {
    inFlightLiveUrlPromises.delete(cleanUrl);
  }
}

async function parseLiveCricketUrlCore(
  cleanUrl: string,
  hintTeam1: string | undefined,
  hintTeam2: string | undefined,
  hintSport: string | undefined,
  cached: { time: number; result: any } | undefined,
  matchedKey: string | null,
  isDemo: boolean
) {
  const isFootball = !isExplicitCricketUrl(cleanUrl) && (hintSport === "football" || isFootballMatch(cleanUrl));
  const isExplicitUpcomingUrl = cleanUrl.toLowerCase().includes("upcoming") || cleanUrl.toLowerCase().includes("not-started");

  // 0 & 1. For Football / Sofascore URLs, query Sofascore Event API, ESPN Soccer API, and 365Scores API in parallel for zero sequential lag!
  if (isFootball || (matchedKey && (matchedKey.includes("football") || matchedKey.includes("sofascore")))) {
    const isSofascoreUrl = isFootball && cleanUrl.toLowerCase().includes("sofascore");
    const [apiData, espnLive, scores365Live] = await Promise.all([
      isSofascoreUrl ? tryFetchSofascoreEventApi(cleanUrl) : Promise.resolve(null),
      tryFetchEspnSoccerMatch(cleanUrl, hintTeam1, hintTeam2, isExplicitUpcomingUrl),
      tryFetch365ScoresSoccerMatch(cleanUrl, hintTeam1, hintTeam2)
    ]);
    if (apiData) {
      liveUrlScrapeCache.set(cleanUrl, { time: Date.now(), result: apiData });
      return apiData;
    }
    if (espnLive) {
      liveUrlScrapeCache.set(cleanUrl, { time: Date.now(), result: espnLive });
      return espnLive;
    }
    if (scores365Live) {
      liveUrlScrapeCache.set(cleanUrl, { time: Date.now(), result: scores365Live });
      return scores365Live;
    }
    const webFootball = await tryFetchFootballViaWebSearch(cleanUrl, hintTeam1, hintTeam2);
    if (webFootball) {
      liveUrlScrapeCache.set(cleanUrl, { time: Date.now(), result: webFootball });
      return webFootball;
    }
  }

  // 2. Handle Demo / Sofascore Presets Matches
  if (isDemo && matchedKey) {
    const demo = advanceDemoMatch(matchedKey) || advanceDemoMatch("demo://ban-vs-ind");
    const result = {
      success: true,
      isDemo: true,
      sport: demo?.sport || (matchedKey.includes("football") || matchedKey.includes("sofascore") ? "football" : "cricket"),
      ...demo,
      lastUpdated: new Date().toLocaleTimeString()
    };
    liveUrlScrapeCache.set(cleanUrl, { time: Date.now(), result });
    return result;
  }

  // Handle custom sofascore:// or football:// URLs not in demoMatches
  if (cleanUrl.toLowerCase().startsWith("sofascore://") || cleanUrl.toLowerCase().startsWith("football://")) {
    const { team1: extT1, team2: extT2, fromUrl } = extractTeamsFromFootballUrl(cleanUrl);
    const fTeam1 = fromUrl ? extT1 : (hintTeam1 && hintTeam1 !== "Team 1" ? hintTeam1 : extT1);
    const fTeam2 = fromUrl ? extT2 : (hintTeam2 && hintTeam2 !== "Team 2" ? hintTeam2 : extT2);
    const prev = cached?.result;
    const isUpc = isExplicitUpcomingUrl;
    let minNum = prev?.footballMinute ? (parseInt(String(prev.footballMinute).replace(/\D/g, ""), 10) || 65) : 65;
    if (!isUpc && prev && minNum < 90) minNum += 1;
    const s1 = isUpc ? 0 : (prev?.footballScore1 ?? 1);
    const s2 = isUpc ? 0 : (prev?.footballScore2 ?? 0);
    const customFbResult = {
      success: true,
      sport: "football",
      team1: fTeam1,
      team2: fTeam2,
      footballScore1: s1,
      footballScore2: s2,
      footballMinute: isUpc ? "Upcoming" : `${minNum}'`,
      footballPeriod: isUpc ? "Not started" : (minNum > 45 ? "2H" : "1H"),
      isUpcoming: isUpc,
      footballGoals: isUpc ? [] : [{ minute: "28'", player: `${fTeam1} Scorer`, team: "team1" }],
      footballCards: [],
      footballStats: {
        possession: [54, 46],
        shots: isUpc ? [0, 0] : [13, 9],
        shotsOnTarget: isUpc ? [0, 0] : [5, 3],
        corners: isUpc ? [0, 0] : [6, 4],
        fouls: isUpc ? [0, 0] : [9, 11],
        yellowCards: isUpc ? [0, 0] : [1, 1],
        redCards: [0, 0],
        offsides: isUpc ? [0, 0] : [2, 1]
      },
      statusText: isUpc ? `Match yet to begin • 0 - 0` : `2nd Half • ${minNum}' (${fTeam1} ${s1} - ${s2} ${fTeam2})`,
      footballVenue: "Official Stadium",
      lastUpdated: new Date().toLocaleTimeString()
    };
    liveUrlScrapeCache.set(cleanUrl, { time: Date.now(), result: customFbResult });
    return customFbResult;
  }

  // 2. Fetch live web page (with zero-sequential-wait CREX parallel & cached scorecard optimization)
  let html = "";
  let resolvedResponseUrl = crexResolvedUrlCache.get(cleanUrl) || cleanUrl;
  let crexScorecardHtml = "";
  try {
    const reqHeaders = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9,bn;q=0.8",
      "Cache-Control": "no-cache",
      "Pragma": "no-cache"
    };

    const isKnownCrexStructured =
      !isFootball &&
      /crex\.(?:com|live)/i.test(resolvedResponseUrl) &&
      (/\/scoreboard\//i.test(resolvedResponseUrl) || /\/cricket-live-score\//i.test(resolvedResponseUrl));

    if (isKnownCrexStructured) {
      const baseCrexUrl = resolvedResponseUrl
        .split("?")[0]
        .replace(/\/(?:live|match-scorecard|scorecard|match-info|info|commentary|squads|match-squads)\/?$/i, "")
        .replace(/\/+$/, "");
      const isScoreboardPath = /\/scoreboard\//i.test(baseCrexUrl);
      const liveViewUrl = isScoreboardPath ? `${baseCrexUrl}/live` : baseCrexUrl;
      const scUrl = isScoreboardPath ? `${baseCrexUrl}/scorecard` : `${baseCrexUrl}/match-scorecard`;
      const cachedSc = crexScorecardHtmlCache.get(baseCrexUrl);

      if (cachedSc && cachedSc.html) {
        crexScorecardHtml = cachedSc.html;
        // Refresh scorecard in the background without blocking the real-time live score request
        if (Date.now() - cachedSc.time > 3500 && !cachedSc.refreshing) {
          cachedSc.refreshing = true;
          axios
            .get(scUrl, { headers: reqHeaders, timeout: 4500, maxRedirects: 5 })
            .then((scRes) => {
              if (typeof scRes.data === "string" && scRes.data.includes("app-root-state")) {
                crexScorecardHtmlCache.set(baseCrexUrl, { time: Date.now(), html: scRes.data, refreshing: false });
              } else {
                cachedSc.refreshing = false;
              }
            })
            .catch(() => {
              cachedSc.refreshing = false;
            });
        }
        const lvRes = await axios.get(liveViewUrl, {
          headers: reqHeaders,
          timeout: 5000,
          maxRedirects: 5
        });
        html = typeof lvRes.data === "string" ? lvRes.data : JSON.stringify(lvRes.data);
      } else {
        // First fetch for this CREX match: fetch live view and scorecard in parallel (single round-trip!)
        const [lvSettled, scSettled] = await Promise.allSettled([
          axios.get(liveViewUrl, { headers: reqHeaders, timeout: 5500, maxRedirects: 5 }),
          axios.get(scUrl, { headers: reqHeaders, timeout: 5500, maxRedirects: 5 })
        ]);
        if (scSettled.status === "fulfilled" && typeof scSettled.value.data === "string" && scSettled.value.data.includes("app-root-state")) {
          crexScorecardHtml = scSettled.value.data;
          crexScorecardHtmlCache.set(baseCrexUrl, { time: Date.now(), html: crexScorecardHtml, refreshing: false });
        }
        if (lvSettled.status === "fulfilled") {
          html = typeof lvSettled.value.data === "string" ? lvSettled.value.data : JSON.stringify(lvSettled.value.data);
        } else if (crexScorecardHtml) {
          html = crexScorecardHtml;
        } else {
          throw (lvSettled as PromiseRejectedResult).reason;
        }
      }
    } else {
      const response = await axios.get(resolvedResponseUrl, {
        headers: reqHeaders,
        timeout: 6000,
        maxRedirects: 5
      });
      html = typeof response.data === "string" ? response.data : JSON.stringify(response.data);
      resolvedResponseUrl = (response.request as any)?.res?.responseUrl || resolvedResponseUrl;
      if (resolvedResponseUrl !== cleanUrl) {
        crexResolvedUrlCache.set(cleanUrl, resolvedResponseUrl);
      }

      // If a short CREX URL redirected to a structured CREX URL on its first request, populate crexScorecardHtmlCache
      if (!isFootball && /crex\.(?:com|live)/i.test(resolvedResponseUrl)) {
        const baseCrexUrl = resolvedResponseUrl
          .split("?")[0]
          .replace(/\/(?:live|match-scorecard|scorecard|match-info|info|commentary|squads|match-squads)\/?$/i, "")
          .replace(/\/+$/, "");
        if (/\/(?:match-scorecard|scorecard)\/?$/i.test(resolvedResponseUrl)) {
          crexScorecardHtml = html;
          crexScorecardHtmlCache.set(baseCrexUrl, { time: Date.now(), html: crexScorecardHtml, refreshing: false });
          const liveViewUrl = /\/scoreboard\//i.test(resolvedResponseUrl)
            ? `${baseCrexUrl}/live`
            : baseCrexUrl;
          try {
            const lvRes = await axios.get(liveViewUrl, {
              headers: reqHeaders,
              timeout: 4500,
              maxRedirects: 5
            });
            if (typeof lvRes.data === "string" && lvRes.data.includes("app-root-state")) {
              html = lvRes.data;
            }
          } catch {}
        } else if (/\/cricket-live-score\//i.test(resolvedResponseUrl) || /\/scoreboard\//i.test(resolvedResponseUrl)) {
          const scUrl = /\/scoreboard\//i.test(resolvedResponseUrl)
            ? `${baseCrexUrl}/scorecard`
            : `${baseCrexUrl}/match-scorecard`;
          try {
            const scRes = await axios.get(scUrl, {
              headers: reqHeaders,
              timeout: 4500,
              maxRedirects: 5
            });
            if (typeof scRes.data === "string" && scRes.data.includes("app-root-state")) {
              crexScorecardHtml = scRes.data;
              crexScorecardHtmlCache.set(baseCrexUrl, { time: Date.now(), html: crexScorecardHtml, refreshing: false });
            }
          } catch {}
        }
      }
    }
  } catch (fetchErr: any) {
    if (cached && cached.result && !cached.result.isFallback) {
      return { ...cached.result, isStale: true, lastUpdated: new Date().toLocaleTimeString() };
    }

    if (isFootball) {
      const { team1: extractedT1, team2: extractedT2, fromUrl } = extractTeamsFromFootballUrl(cleanUrl);
      const isCroatiaEngland = cleanUrl.toLowerCase().includes("croatia") && cleanUrl.toLowerCase().includes("england");
      const hasValidHint1 = Boolean(hintTeam1 && !/^(?:team\s*[12ab]|টিম\s*[এবি১২12]|t[12])$/i.test(hintTeam1.trim()));
      const hasValidHint2 = Boolean(hintTeam2 && !/^(?:team\s*[12ab]|টিম\s*[এবি১২12]|t[12])$/i.test(hintTeam2.trim()));
      const fTeam1 = isCroatiaEngland ? "Croatia" : (hasValidHint1 ? hintTeam1!.trim() : (fromUrl ? extractedT1 : extractedT1));
      const fTeam2 = isCroatiaEngland ? "England" : (hasValidHint2 ? hintTeam2!.trim() : (fromUrl ? extractedT2 : extractedT2));

      // Never invent a fake 1-0 score or fake 24' goal for unstarted/unreachable football URLs!
      const footballResult = {
        success: true,
        isFallback: true,
        sport: "football",
        team1: fTeam1,
        team2: fTeam2,
        footballScore1: 0,
        footballScore2: 0,
        footballMinute: "Upcoming",
        footballPeriod: "Not started",
        isUpcoming: true,
        isFinished: false,
        footballGoals: [],
        footballCards: [],
        footballStats: {
          possession: [50, 50],
          shots: [0, 0],
          shotsOnTarget: [0, 0],
          corners: [0, 0],
          fouls: [0, 0],
          yellowCards: [0, 0],
          redCards: [0, 0],
          offsides: [0, 0]
        },
        statusText: `Match yet to begin • 0 - 0`,
        footballVenue: isCroatiaEngland ? "Stadion Maksimir" : "Official Stadium",
        lastUpdated: new Date().toLocaleTimeString()
      };
      liveUrlScrapeCache.set(cleanUrl, { time: Date.now(), result: footballResult });
      return footballResult;
    }

    // Extract teams from URL slug if external access is blocked or restricted for cricket
    const { team1: urlT1, team2: urlT2, fromUrl: hasUrlTeams } = extractTeamsFromCricketUrl(cleanUrl);
    const team1Name = (!isPlaceholderCricketTeam(hintTeam1) ? hintTeam1! : (hasUrlTeams ? urlT1 : urlT1)) || "BAN";
    const team2Name = (!isPlaceholderCricketTeam(hintTeam2) ? hintTeam2! : (hasUrlTeams ? urlT2 : urlT2)) || "IND";
    const isDemoScheme = cleanUrl.toLowerCase().startsWith("demo://") || cleanUrl.toLowerCase().startsWith("test://");
    const isUpcUrl = !isDemoScheme || cleanUrl.toLowerCase().includes("upcoming") || cleanUrl.toLowerCase().includes("not-started");

    // Advance score ONLY for explicit demo:// or test:// URLs
    const prevCached = cached?.result;
    const outcomes = [0, 1, 1, 2, 4, 6, 0, 1];
    const addRuns = isUpcUrl ? 0 : outcomes[Math.floor(Math.random() * outcomes.length)];
    const prevBalls = typeof prevCached?.totalBalls === "number" && prevCached.totalBalls > 0 ? prevCached.totalBalls : 91;
    const nextBalls = isUpcUrl ? 0 : (prevBalls >= 120 ? 6 : prevBalls + 1);
    const nextScore = isUpcUrl ? 0 : (prevBalls >= 120 ? 8 : (prevCached?.score || 142) + addRuns);
    const nextWickets = isUpcUrl ? 0 : (prevCached?.wickets ?? 3);
    const nextOvers = Math.floor(nextBalls / 6);
    const nextBallsInOver = nextBalls % 6;
    const nextTarget = isUpcUrl ? undefined : (prevCached?.target || 178);
    const ballSym = addRuns === 0 ? "•" : String(addRuns);
    const nextRecent = isUpcUrl ? [] : [...(prevCached?.recentBalls || ["1", "4", "•", "2", "1"]).slice(-5), ballSym];

    // Cricket Fallback Format
    const fallbackResult = {
      success: true,
      isFallback: true,
      sport: "cricket",
      team1: team1Name,
      team2: team2Name,
      battingTeam: team1Name,
      bowlingTeam: team2Name,
      score: nextScore,
      wickets: nextWickets,
      overs: nextOvers,
      ballsInOver: nextBallsInOver,
      totalBalls: nextBalls,
      target: nextTarget,
      format: "20",
      statusText: isUpcUrl
        ? `Match scheduled • ${team1Name} vs ${team2Name}`
        : `${team1Name} need ${Math.max(1, nextTarget - nextScore)} runs in ${Math.max(1, 120 - nextBalls)} balls`,
      recentBalls: nextRecent,
      lastBallSymbol: isUpcUrl ? undefined : ballSym,
      batsmen: [
        { name: `${team1Name} Batter 1`, runs: Math.max(12, Math.floor(nextScore * 0.42)), balls: Math.max(10, Math.floor(nextBalls * 0.45)), fours: 4, sixes: 2 },
        { name: `${team1Name} Batter 2`, runs: Math.max(8, Math.floor(nextScore * 0.28)), balls: Math.max(8, Math.floor(nextBalls * 0.32)), fours: 3, sixes: 1 }
      ],
      bowler: { name: `${team2Name} Bowler`, overs: `${Math.min(3, nextOvers)}.${nextBallsInOver}`, runs: 26, wickets: Math.min(2, nextWickets) },
      isUpcoming: isUpcUrl,
      lastUpdated: new Date().toLocaleTimeString()
    };
    liveUrlScrapeCache.set(cleanUrl, { time: Date.now(), result: fallbackResult });
    return fallbackResult;
  }

  const spacedHtml = html.replace(/>(\s*)</g, "> $1<");
  const $ = cheerio.load(spacedHtml);

  // Extract titles and meta descriptions
  const pageTitle = $("title").text().trim();
  const ogTitle = $('meta[property="og:title"]').attr("content") || "";
  const ogDesc = $('meta[property="og:description"]').attr("content") || "";
  const metaDesc = $('meta[name="description"]').attr("content") || "";
  const bodyText = $("body").text().replace(/\s+/g, " ").slice(0, 8000);

  const combinedHeader = `${pageTitle} | ${ogTitle} | ${ogDesc} | ${metaDesc}`;

  // If HTML or URL indicates Football
  if (isFootball || isFootballMatch(cleanUrl, combinedHeader)) {
    const { team1: urlT1, team2: urlT2 } = extractTeamsFromFootballUrl(cleanUrl);
    let fTeam1 = "";
    let fTeam2 = "";
    let fScore1 = 0;
    let fScore2 = 0;
    let fMinute = "Live";
    let fPeriod = "2H";
    let hasExplicitScore = false;
    let fbStartTime = "";
    let fbStartTimeIso = "";

    // Check JSON-LD for SportsEvent in Football HTML
    $('script[type="application/ld+json"]').each((_i, el) => {
      try {
        const raw = $(el).html() || "";
        if (!raw) return;
        const parsed = JSON.parse(raw);
        const items = Array.isArray(parsed) ? parsed : [parsed];
        for (const it of items) {
          if (it && typeof it === "object") {
            if (it.homeTeam?.name && !fTeam1) fTeam1 = it.homeTeam.name;
            if (it.awayTeam?.name && !fTeam2) fTeam2 = it.awayTeam.name;
            if (it.startDate) {
              fbStartTimeIso = it.startDate;
              const d = new Date(it.startDate);
              if (!isNaN(d.getTime())) {
                fbStartTime = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) + ` (${d.toLocaleDateString([], { month: "short", day: "numeric" })})`;
              }
            }
          }
        }
      } catch {}
    });

    // Parse Football Score: e.g. "Real Madrid 2 - 1 Barcelona" or "Arsenal 3-1 Chelsea"
    const fbScoreRegex = /([A-Za-z0-9\s.&'-]{2,25}?)\s+(\d{1,2})\s*[-–:]\s*(\d{1,2})\s+([A-Za-z0-9\s.&'-]{2,25})/i;
    const fbMatch = combinedHeader.match(fbScoreRegex);
    if (fbMatch) {
      hasExplicitScore = true;
      if (!fTeam1) fTeam1 = fbMatch[1].trim().replace(/^(?:live|watch|track)\s+/i, "");
      fScore1 = parseInt(fbMatch[2], 10) || 0;
      fScore2 = parseInt(fbMatch[3], 10) || 0;
      if (!fTeam2) fTeam2 = fbMatch[4].trim().replace(/\s+(?:live|scores?|sofascore|flashscore|fotmob|match|result|highlights?).*/i, "");
    }

    // Also check "Team1 vs Team2" in header if teams not yet found
    if (!fTeam1 || !fTeam2) {
      const fbTeamsRegex = /([A-Za-z0-9\s.&'-]{2,25}?)\s+(?:vs\.?|v)\s+([A-Za-z0-9\s.&'-]{2,25})/i;
      const tMatch = combinedHeader.match(fbTeamsRegex);
      if (tMatch) {
        if (!fTeam1) fTeam1 = tMatch[1].trim().replace(/^(?:live|watch|track)\s+/i, "");
        if (!fTeam2) fTeam2 = tMatch[2].trim().replace(/\s+(?:live|scores?|sofascore|flashscore|fotmob|match|result|highlights?).*/i, "");
      }
    }

    const hasValidHint1 = Boolean(hintTeam1 && !/^(?:team\s*[12ab]|টিম\s*[এবি১২12]|t[12])$/i.test(hintTeam1.trim()));
    const hasValidHint2 = Boolean(hintTeam2 && !/^(?:team\s*[12ab]|টিম\s*[এবি১২12]|t[12])$/i.test(hintTeam2.trim()));
    if (!fTeam1 || fTeam1 === "Team 1" || /^(?:team\s*[12ab]|sofascore|flashscore|1xbet|melbet)$/i.test(fTeam1.trim())) {
      fTeam1 = hasValidHint1 ? hintTeam1!.trim() : urlT1;
    }
    if (!fTeam2 || fTeam2 === "Team 2" || /^(?:team\s*[12ab]|sofascore|flashscore|1xbet|melbet)$/i.test(fTeam2.trim())) {
      fTeam2 = hasValidHint2 ? hintTeam2!.trim() : urlT2;
    }

    const minMatch = combinedHeader.match(/\b(\d{1,3}(?:\+\d{1,2})?)['’]/) || bodyText.match(/\b(\d{1,3}(?:\+\d{1,2})?)['’]/);
    if (minMatch) {
      fMinute = `${minMatch[1]}'`;
      fPeriod = parseInt(minMatch[1], 10) > 45 ? "2H" : "1H";
    } else if (/\b(?:full\s*time|match\s+ended|match\s+finished)\b/i.test(`${pageTitle} | ${ogTitle}`) && !/\blive\b/i.test(pageTitle)) {
      fMinute = "FT";
      fPeriod = "FT";
    } else if (/\b(?:half\s*time|HT)\b/i.test(`${pageTitle} | ${ogTitle}`)) {
      fMinute = "HT";
      fPeriod = "HT";
    }

    const isCroatiaEngland = cleanUrl.toLowerCase().includes("croatia") && cleanUrl.toLowerCase().includes("england");
    if (isCroatiaEngland && (fTeam1 === "Team 1" || !fTeam1)) {
      fTeam1 = "Croatia";
      fTeam2 = "England";
    }

    // Check ESPN live soccer feed with the parsed team names if we still don't have explicit score/minute
    if (!hasExplicitScore && !minMatch) {
      const espnMatch = await tryFetchEspnSoccerMatch(cleanUrl, fTeam1, fTeam2);
      if (espnMatch) {
        liveUrlScrapeCache.set(cleanUrl, { time: Date.now(), result: espnMatch });
        return espnMatch;
      }
    }

    const isFutureStart = fbStartTimeIso ? new Date(fbStartTimeIso).getTime() > Date.now() + 60000 : false;
    const isUpcoming =
      !hasExplicitScore &&
      !minMatch &&
      fMinute !== "FT" &&
      fMinute !== "HT";

    if (isUpcoming || isFutureStart) {
      fMinute = "Upcoming";
      fPeriod = "Not started";
      fScore1 = 0;
      fScore2 = 0;
    }

    const footballParsed = {
      success: true,
      sport: "football",
      team1: fTeam1 || "Team 1",
      team2: fTeam2 || "Team 2",
      footballScore1: fScore1,
      footballScore2: fScore2,
      footballMinute: fMinute,
      footballPeriod: fPeriod,
      isUpcoming: isUpcoming || isFutureStart,
      isFinished: fPeriod === "FT" || fMinute === "FT",
      matchStartTime: fbStartTime || undefined,
      matchStartTimeIso: fbStartTimeIso || undefined,
      footballGoals: [],
      footballCards: [],
      footballStats: {
        possession: [50, 50],
        shots: [0, 0],
        shotsOnTarget: [0, 0],
        corners: [0, 0],
        fouls: [0, 0],
        yellowCards: [0, 0],
        redCards: [0, 0],
        offsides: [0, 0]
      },
      statusText: (isUpcoming || isFutureStart)
        ? `Match yet to begin${fbStartTime ? ` • Starts at ${fbStartTime}` : ""} (0 - 0)`
        : `${fMinute} • ${fTeam1 || "Team 1"} ${fScore1} - ${fScore2} ${fTeam2 || "Team 2"}`,
      lastUpdated: new Date().toLocaleTimeString()
    };
    liveUrlScrapeCache.set(cleanUrl, { time: Date.now(), result: footballParsed });
    return footballParsed;
  }

  let team1 = "";
  let team2 = "";
  let battingTeam = "";
  let bowlingTeam = "";
  let score = 0;
  let wickets = 0;
  let overs = 0;
  let ballsInOver = 0;
  let target = 0;
  let statusText = "";
  let isUpcoming = false;
  let matchStartTime = "";
  let matchStartTimeIso = "";
  let firstInningsScore: string | number | undefined = undefined;
  const recentBalls: string[] = [];
  const batsmen: any[] = [];
  let bowler: any = null;

  // Next.js JSON Extraction (__NEXT_DATA__) used by web cricket sites
  const nextDataScript = $('script#__NEXT_DATA__').html();
  if (nextDataScript) {
    try {
      const nextData = JSON.parse(nextDataScript);
      const pageProps = nextData?.props?.pageProps;
      const matchData = pageProps?.matchData || pageProps?.matchDetail || pageProps?.data;
      if (matchData) {
        if (matchData.team1Name || matchData.team1) team1 = matchData.team1Name || matchData.team1;
        if (matchData.team2Name || matchData.team2) team2 = matchData.team2Name || matchData.team2;
        if (matchData.currentScore) {
          const sMatch = String(matchData.currentScore).match(/(\d+)\/(\d+)/);
          if (sMatch) {
            score = parseInt(sMatch[1], 10);
            wickets = parseInt(sMatch[2], 10);
          }
        }
        if (matchData.overs) {
          const ovParts = String(matchData.overs).split('.');
          overs = parseInt(ovParts[0], 10) || 0;
          ballsInOver = parseInt(ovParts[1], 10) || 0;
        }
        if (matchData.status) statusText = matchData.status;
        if (matchData.target && parseInt(matchData.target, 10) > 35) {
          target = parseInt(matchData.target, 10);
        }
        if (matchData.team1Score || matchData.innings1 || matchData.innings1Score || matchData.firstInningsScore) {
          const raw1 = matchData.team1Score || matchData.innings1 || matchData.innings1Score || matchData.firstInningsScore;
          firstInningsScore = String(raw1).trim();
        }
      }
    } catch {}
  }

  // Check Schema JSON-LD metadata for startDate
  $('script[type="application/ld+json"]').each((_i, el) => {
    try {
      const raw = $(el).html() || "";
      if (!raw) return;
      const parsed = JSON.parse(raw);
      const items = Array.isArray(parsed) ? parsed : [parsed];
      for (const it of items) {
        if (it && typeof it === 'object') {
          if (it.startDate) {
            let rawStart = String(it.startDate).trim();
            if (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}(?::\d{2})?$/.test(rawStart)) {
              rawStart = rawStart.replace(/\s+/, "T") + "Z";
            }
            matchStartTimeIso = rawStart;
            try {
              const d = new Date(rawStart);
              if (!isNaN(d.getTime())) {
                matchStartTime = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + ', ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              }
            } catch {}
            if (!matchStartTime) {
              matchStartTime = String(it.startDate).trim();
            }
          }
          if (it.eventStatus && /scheduled|upcoming|notstarted/i.test(String(it.eventStatus))) {
            isUpcoming = true;
          }
        }
      }
    } catch {}
  });

  // Also check <time datetime="..."> or explicit date/time strings in page if JSON-LD didn't have startDate
  if (!matchStartTimeIso) {
    const timeAttr = $('time[datetime]').first().attr('datetime');
    if (timeAttr) {
      const d = new Date(timeAttr);
      if (!isNaN(d.getTime())) {
        matchStartTimeIso = d.toISOString();
        matchStartTime = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + ', ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
    }
  }
  if (!matchStartTime) {
    const dateTimeRegex = /\b(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4}(?:,?\s+\d{1,2}:\d{2}\s*(?:AM|PM)?)?|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4}(?:,?\s+\d{1,2}:\d{2}\s*(?:AM|PM)?)?|\d{1,2}:\d{2}\s*(?:AM|PM))\b/i;
    const dtMatch = (combinedHeader + " " + bodyText.slice(0, 2000)).match(dateTimeRegex);
    if (dtMatch && dtMatch[1]) {
      matchStartTime = dtMatch[1].trim();
    }
  }

  // Check for upcoming indicators in header or DOM status boxes or invalid pre-match stats like "172/42 0.0"
  // IMPORTANT: Never treat a live match break (Innings Break, Drinks Break, Strategic Timeout, Lunch, Tea, Stumps, Rain, etc.) as upcoming!
  const domStatusText = $(".team-result .result-box, .result-box, .match-status").text().replace(/\s+/g, " ").trim();
  const hasLiveBreakOrPlayClue = /\b(?:innings?\s*break|drinks?\s*break|drinks?\b|strategic\s*time\s*out|time\s*out|lunch\s*break|lunch\b|tea\s*break|tea\b|dinner\s*break|stumps\b|rain\s*delay|rain\s*break|rain\s*stopped|bad\s*light|wet\s*outfield|delayed|interrupted|in\s+progress|need[s]?\s+\d+\s+runs?|opt(?:ed)?\s+to\s+(?:bat|bowl|field)|elected\s+to\s+(?:bat|bowl|field)|chose\s+to\s+(?:bat|bowl|field)|end\s+of\s+(?:1st|first)\s+innings)\b/i.test(
    `${combinedHeader} | ${domStatusText}`
  );
  const hasExplicitUpcomingText =
    !hasLiveBreakOrPlayClue &&
    /\b(?:match\s+starts\s+in|starts\s+in|yet\s+to\s+begin|yet\s+to\s+start|match\s+scheduled|toss\s+at)\b/i.test(
      `${combinedHeader} | ${domStatusText}`
    );
  if (hasExplicitUpcomingText) {
    isUpcoming = true;
  }
  const bogusZeroOverPattern = /\b(\d{1,4})[\/-](\d{1,3})\s*\(?\s*0\.0\s*(?:ov(?:ers?)?)?\s*\)?/i;
  const bogusMatch = combinedHeader.match(bogusZeroOverPattern) || bodyText.match(bogusZeroOverPattern);
  let hasBogusPreMatchScore = false;
  if (bogusMatch) {
    const bRuns = parseInt(bogusMatch[1], 10) || 0;
    const bWkts = parseInt(bogusMatch[2], 10) || 0;
    if (bRuns > 0 || bWkts > 0) {
      // e.g. "172/42 0.0" -> treat as upcoming match until it becomes "0/0 0.0"
      hasBogusPreMatchScore = true;
      isUpcoming = true;
      score = 0;
      wickets = 0;
      overs = 0;
      ballsInOver = 0;
    }
  }

  // Detect teams first from URL & title e.g. "WP vs SA-E" or "ENG-C vs IND-C"
  const { team1: urlCricketT1, team2: urlCricketT2, fromUrl: hasUrlCricketTeams } = extractTeamsFromCricketUrl(cleanUrl);
  const isGenericSiteTitle = (s?: string) => isPlaceholderCricketTeam(s);

  if (!team1 || !team2) {
    // Also support titles where score is between Team1 and "vs" Team2, e.g. "SA-E 145/4 (16.2) vs WP"
    const teamsWithScoreRegex = /([A-Za-z0-9]+(?:-[A-Za-z0-9]+)*|[A-Za-z\s]{2,22}?)\s+(?:\d{1,3}[\/-]\d{1,2}\s*(?:\([^)]*\)|\d{1,2}(?:\.\d)?\s*(?:ov(?:ers?)?)?)?\s+)?(?:vs\.?|v|against)\s+([A-Za-z0-9]+(?:-[A-Za-z0-9]+)*|[A-Za-z\s]{2,22})/i;
    const teamsMatch = combinedHeader.match(teamsWithScoreRegex);
    if (teamsMatch) {
      const cand1 = teamsMatch[1].trim().replace(/^(?:track|watch|live|stream|summary)\s+/i, '');
      const cand2 = teamsMatch[2].trim().replace(/^(?:track|watch|live|stream|summary)\s+/i, '').replace(/\s+(?:Live|Score|Commentary|Match|T20|ODI|Test|Highlights|CREX|Cricbuzz|ESPNcricinfo).*/i, "");
      if (!isGenericSiteTitle(cand1) && !isGenericSiteTitle(cand2)) {
        team1 = cand1;
        team2 = cand2;
      }
    }
  }

  if (isGenericSiteTitle(team1)) {
    team1 = (!isGenericSiteTitle(hintTeam1) ? hintTeam1! : (hasUrlCricketTeams ? urlCricketT1 : urlCricketT1)) || "BAN";
  }
  if (isGenericSiteTitle(team2)) {
    team2 = (!isGenericSiteTitle(hintTeam2) ? hintTeam2! : (hasUrlCricketTeams ? urlCricketT2 : urlCricketT2)) || "IND";
  }

  // Normalize team1 & team2 to canonical codes if they match URL teams
  if (hasUrlCricketTeams && urlCricketT1 && urlCricketT2) {
    if (matchCricketTeamToken(team1, urlCricketT1, urlCricketT2) === urlCricketT1) team1 = urlCricketT1;
    if (matchCricketTeamToken(team2, urlCricketT1, urlCricketT2) === urlCricketT2) team2 = urlCricketT2;
  }

  // Helper to resolve which team a score at `matchIdx` in `srcText` belongs to
  const resolveTeamNearScore = (srcText: string, matchIdx: number, matchLen: number): string | undefined => {
    const prefix = srcText.slice(Math.max(0, matchIdx - 48), matchIdx);
    const prefixClean = prefix.replace(/^.*[|•;,\n]/, "").trim();
    const prefixTokens = prefixClean.match(/[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*/g) || [];
    if (prefixTokens.length > 0) {
      // Check longest multi-word team phrase first (3 tokens -> 2 tokens -> 1 token)
      for (const count of [3, 2, 1]) {
        if (prefixTokens.length >= count) {
          const candidate = prefixTokens.slice(-count).join("-");
          const matched = matchCricketTeamToken(candidate, team1, team2);
          if (matched) {
            return matched;
          }
        }
      }
    }
    const suffix = srcText.slice(matchIdx + matchLen, matchIdx + matchLen + 32);
    const suffixClean = (suffix.split(/[|•;,\n]/)[0] || "").trim();
    const suffixTokens = suffixClean.match(/[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*/g) || [];
    if (suffixTokens.length > 0 && !/^(?:vs|v|need|needs|won|opt|opted|target|crr|rrr|ov|overs)$/i.test(suffixTokens[0])) {
      for (const count of [3, 2, 1]) {
        if (suffixTokens.length >= count) {
          const candidate = suffixTokens.slice(0, count).join("-");
          const matched = matchCricketTeamToken(candidate, team1, team2);
          if (matched) return matched;
        }
      }
    }
    return undefined;
  };

  // Scan both combinedHeader and top scoreboard section of bodyText for all valid cricket scores
  const scoreSearchText = `${combinedHeader} | ${bodyText.slice(0, 3500)}`;
  const allScoresRegex = /(\d{1,3})[\/-](\d{1,2})\s*(?:\(\s*(\d{1,2})(?:\.(\d))?\s*(?:ov(?:ers?)?)?\s*\)|(\d{1,2})\.([0-5])\s*(?:ov(?:ers?)?)?\b|(\d{1,2})\s*ov(?:ers?)?\b)/gi;
  // Also match CREX right-side team score format where (overs) precedes runs-wickets: e.g. "BBZ (9.1) 101-10" or "ENGCH (20.0) 192-4"
  const reversedScoresRegex = /\(\s*(\d{1,2})(?:\.([0-5]))?\s*(?:ov(?:ers?)?)?\s*\)\s*(\d{1,3})[\/-](\d{1,2})\b/gi;
  const foundScores: Array<{
    matchedTeam?: string;
    runs: number;
    wkts: number;
    ov: number;
    ballsInOv: number;
    rawScoreStr: string;
    formattedWithOvers: string;
    hasOvers: boolean;
    fromCrexInningIdx?: number;
  }> = [];

  const parseInningScoreText = (txt: string): {
    runs: number;
    wkts: number;
    ov: number;
    ballsInOv: number;
    hasOvers: boolean;
    rawScoreStr: string;
    formattedWithOvers: string;
  } | null => {
    if (!txt || /yet\s+to\s+bat/i.test(txt)) return null;
    let ovWhole = 0;
    let ovBalls = 0;
    let hasOvers = false;
    let rest = txt;
    const parenOv = rest.match(/\(\s*(\d{1,2})(?:\.([0-5]))?\s*(?:ov(?:ers?)?)?\s*\)/i);
    if (parenOv) {
      ovWhole = parseInt(parenOv[1], 10) || 0;
      ovBalls = parseInt(parenOv[2] || "0", 10) || 0;
      hasOvers = true;
      rest = rest.replace(parenOv[0], " ");
    } else {
      const decOv = rest.match(/\b(\d{1,2})\.([0-5])\s*(?:ov(?:ers?)?)?\b/i);
      if (decOv) {
        ovWhole = parseInt(decOv[1], 10) || 0;
        ovBalls = parseInt(decOv[2] || "0", 10) || 0;
        hasOvers = true;
        rest = rest.replace(decOv[0], " ");
      }
    }
    const rwMatch = rest.match(/\b(\d{1,3})\s*[\/-]\s*(\d{1,2})\b/);
    let runs = 0;
    let wkts = 0;
    if (rwMatch) {
      runs = parseInt(rwMatch[1], 10);
      wkts = parseInt(rwMatch[2], 10);
    } else if (hasOvers) {
      const runsOnlyMatch = rest.match(/\b(\d{2,3})\b/);
      if (runsOnlyMatch) {
        runs = parseInt(runsOnlyMatch[1], 10);
        wkts = 10;
      } else {
        return null;
      }
    } else {
      return null;
    }
    if (wkts > 10 || runs >= 650 || ovWhole > 90 || ovBalls > 5) return null;
    if (ovWhole === 0 && ovBalls === 0 && (runs > 0 || wkts > 0)) return null;
    const ov = parseFloat(`${ovWhole}.${ovBalls}`) || 0;
    const ovStr = hasOvers ? ` (${ovWhole}.${ovBalls})` : "";
    return {
      runs,
      wkts,
      ov,
      ballsInOv: Math.min(5, ovBalls),
      hasOvers,
      rawScoreStr: `${runs}/${wkts}`,
      formattedWithOvers: `${runs}/${wkts}${ovStr}`
    };
  };

  // 1a) Directly inspect CREX .team-inning blocks (handles both left "105-4 (6.5)" and right "(9.1) 101-10")
  const crexInningsEls = $(".team-inning");
  let crexInningsWithScoreCount = 0;
  if (crexInningsEls.length > 0) {
    const crexTeamNames: string[] = [];
    crexInningsEls.each((_idx, el) => {
      const tNameRaw = $(el).find(".team-name").text().replace(/\s+/g, " ").trim();
      if (tNameRaw) crexTeamNames.push(tNameRaw);
    });
    if (crexTeamNames.length >= 2 && (isGenericSiteTitle(team1) || isGenericSiteTitle(team2))) {
      team1 = formatCricketTeamSlug(crexTeamNames[0].toLowerCase().replace(/\s+/g, "-")) || crexTeamNames[0];
      team2 = formatCricketTeamSlug(crexTeamNames[1].toLowerCase().replace(/\s+/g, "-")) || crexTeamNames[1];
    }

    crexInningsEls.each((inningIdx, el) => {
      const tNameRaw = $(el).find(".team-name").text().replace(/\s+/g, " ").trim();
      const explicitScoreDom = $(el).find(".runs, .team-score, .score-over").text().replace(/\s+/g, " ").trim();
      const scoreBlockRaw = explicitScoreDom || $(el).text().replace(/\s+/g, " ").trim();
      const parsedScore = parseInningScoreText(scoreBlockRaw);
      if (!parsedScore) return;
      crexInningsWithScoreCount++;
      const matchedT =
        matchCricketTeamToken(tNameRaw, team1, team2) ||
        formatCricketTeamSlug(tNameRaw.toLowerCase().replace(/\s+/g, "-")) ||
        tNameRaw ||
        undefined;
      foundScores.push({
        matchedTeam: matchedT,
        runs: parsedScore.runs,
        wkts: parsedScore.wkts,
        ov: parsedScore.ov,
        ballsInOv: parsedScore.ballsInOv,
        rawScoreStr: parsedScore.rawScoreStr,
        formattedWithOvers: parsedScore.formattedWithOvers,
        hasOvers: parsedScore.hasOvers,
        fromCrexInningIdx: inningIdx
      });
    });
  }

  // 1b) Inspect other structured DOM scoreboard containers (Cricbuzz, ESPNcricinfo)
  $(".cb-hmscg-bat-txt, .cb-hmscg-bwl-txt, .ci-team-score, .team-score-card, .inning-card").each((_i, el) => {
    const blockText = $(el).text().replace(/\s+/g, " ").trim();
    if (!blockText) return;
    const parsedScore = parseInningScoreText(blockText);
    if (parsedScore) {
      const mTeam = resolveTeamNearScore(blockText, 0, blockText.length);
      if (mTeam && !foundScores.some(ex => ex.matchedTeam === mTeam)) {
        foundScores.push({
          matchedTeam: mTeam,
          runs: parsedScore.runs,
          wkts: parsedScore.wkts,
          ov: parsedScore.ov,
          ballsInOv: parsedScore.ballsInOv,
          rawScoreStr: parsedScore.rawScoreStr,
          formattedWithOvers: parsedScore.formattedWithOvers,
          hasOvers: parsedScore.hasOvers
        });
      }
    }
  });

  const isBogusH2HScore = (r: number, w: number, oW: number, oB: number) => {
    if (oB === 0 && (oW === 20 || oW === 10 || oW === 50) && r <= 18 && (r + w === 10 || r + w === 5 || r <= 12)) {
      return true;
    }
    return false;
  };

  // 2) Scan combinedHeader and bodyText if we don't yet have both teams' scores from DOM containers
  const isCrexWithoutInningsDom = cleanUrl.toLowerCase().includes("crex") && crexInningsWithScoreCount === 0;
  const effectiveScoreSearchText = (isCrexWithoutInningsDom || hasExplicitUpcomingText || isUpcoming) ? combinedHeader : scoreSearchText;
  if (foundScores.length < 2 && !hasExplicitUpcomingText && !isCrexWithoutInningsDom) {
    let sm;
    while ((sm = allScoresRegex.exec(effectiveScoreSearchText)) !== null) {
      // Ignore bowler figures followed by Econ: (e.g. "0-33 (1.5) Econ: 18.00")
      const trailingAfter = effectiveScoreSearchText.slice(sm.index + sm[0].length, sm.index + sm[0].length + 24);
      if (/^\s*\)?\s*(?:Econ|M:|R:|W:)/i.test(trailingAfter)) continue;

      const runsVal = parseInt(sm[1], 10);
      const wktsVal = parseInt(sm[2], 10);
      const ovWhole = parseInt(sm[3] ?? sm[5] ?? sm[7] ?? "0", 10) || 0;
      const ovBalls = parseInt(sm[4] ?? sm[6] ?? "0", 10) || 0;
      const ovVal = parseFloat(`${ovWhole}.${ovBalls}`) || 0;
      if (wktsVal > 10 || runsVal >= 650 || ovWhole > 90 || ovBalls > 5) continue;
      if (isBogusH2HScore(runsVal, wktsVal, ovWhole, ovBalls)) {
        hasBogusPreMatchScore = true;
        continue;
      }
      if (ovWhole === 0 && ovBalls === 0 && (runsVal > 0 || wktsVal > 0)) {
        hasBogusPreMatchScore = true;
        continue;
      }
      const matchedTeam = resolveTeamNearScore(effectiveScoreSearchText, sm.index, sm[0].length);
      const isDup = foundScores.some(
        ex =>
          (ex.runs === runsVal && ex.wkts === wktsVal && ex.ov === ovVal && (!matchedTeam || ex.matchedTeam === matchedTeam)) ||
          (matchedTeam && ex.matchedTeam === matchedTeam)
      );
      if (!isDup) {
        foundScores.push({
          matchedTeam,
          runs: runsVal,
          wkts: wktsVal,
          ov: ovVal,
          ballsInOv: Math.min(5, ovBalls),
          rawScoreStr: `${runsVal}/${wktsVal}`,
          formattedWithOvers: `${runsVal}/${wktsVal} (${ovWhole}.${Math.min(5, ovBalls)})`,
          hasOvers: true
        });
      }
    }

    // Scan for reversed "(overs) runs-wickets" in effectiveScoreSearchText (e.g. "BBZ (9.1) 101-10")
    let rsm;
    while ((rsm = reversedScoresRegex.exec(effectiveScoreSearchText)) !== null) {
      const ovWhole = parseInt(rsm[1] || "0", 10) || 0;
      const ovBalls = parseInt(rsm[2] || "0", 10) || 0;
      const runsVal = parseInt(rsm[3], 10);
      const wktsVal = parseInt(rsm[4], 10);
      const ovVal = parseFloat(`${ovWhole}.${ovBalls}`) || 0;
      if (wktsVal > 10 || runsVal >= 650 || ovWhole > 90 || ovBalls > 5) continue;
      if (isBogusH2HScore(runsVal, wktsVal, ovWhole, ovBalls)) continue;
      if (ovWhole === 0 && ovBalls === 0 && (runsVal > 0 || wktsVal > 0)) continue;
      const matchedTeam = resolveTeamNearScore(effectiveScoreSearchText, rsm.index, rsm[0].length);
      const isDup = foundScores.some(
        ex =>
          (ex.runs === runsVal && ex.wkts === wktsVal && ex.ov === ovVal) ||
          (matchedTeam && ex.matchedTeam === matchedTeam)
      );
      if (!isDup) {
        foundScores.push({
          matchedTeam,
          runs: runsVal,
          wkts: wktsVal,
          ov: ovVal,
          ballsInOv: Math.min(5, ovBalls),
          rawScoreStr: `${runsVal}/${wktsVal}`,
          formattedWithOvers: `${runsVal}/${wktsVal} (${ovWhole}.${Math.min(5, ovBalls)})`,
          hasOvers: true
        });
      }
    }
  }

  // Also check for completed innings scores written without overs right next to a team name (e.g. "ENG-C 185/6 vs IND-C 188/5")
  const teamScoreNoOvRegex = /\b([A-Za-z0-9]+(?:-[A-Za-z0-9]+)*)\s*[:=-]?\s*(\d{1,3})[\/-](\d{1,2})\b(?!\s*(?:\(\s*\d|\d{1,2}\.[0-5]|\.\d))/gi;
  let tsm;
  if (!isCrexWithoutInningsDom && !hasExplicitUpcomingText && !isUpcoming) {
    while ((tsm = teamScoreNoOvRegex.exec(effectiveScoreSearchText)) !== null) {
      const matchedTeam = matchCricketTeamToken(tsm[1], team1, team2);
      if (!matchedTeam) continue;
      const runsVal = parseInt(tsm[2], 10);
      const wktsVal = parseInt(tsm[3], 10);
      if (wktsVal > 10 || runsVal >= 650 || (runsVal === 0 && wktsVal === 0)) continue;
      const alreadyHasTeam = foundScores.some(ex => ex.matchedTeam === matchedTeam);
      if (!alreadyHasTeam) {
        foundScores.push({
          matchedTeam,
          runs: runsVal,
          wkts: wktsVal,
          ov: 20,
          ballsInOv: 0,
          rawScoreStr: `${runsVal}/${wktsVal}`,
          formattedWithOvers: `${runsVal}/${wktsVal}`,
          hasOvers: false
        });
      }
    }
  }

  // If a real live score (including 0/0 0.0!) or a live break was found, the match is LIVE (not upcoming)
  if ((foundScores.length > 0 && !hasExplicitUpcomingText && !isCrexWithoutInningsDom) || hasLiveBreakOrPlayClue) {
    isUpcoming = false;
  } else if (foundScores.length === 0 && (hasBogusPreMatchScore || isCrexWithoutInningsDom)) {
    isUpcoming = true;
  }

  // Extract clean status text from CREX .result-box first, or fallback to regex
  const crexResultBoxText = $(".team-result .result-box, .result-box").first().text().replace(/<[^>]*>?/g, "").replace(/\s+/g, " ").trim();
  if (crexResultBoxText && crexResultBoxText.length > 3 && !/^(?:over|ov|\d+|w|wd|nb)$/i.test(crexResultBoxText)) {
    statusText = crexResultBoxText;
  }
  if (!statusText && !isCrexWithoutInningsDom && !isUpcoming) {
    const cleanScoreSearch = effectiveScoreSearchText.replace(/<[^>]*>?/g, " ");
    const statusBannerMatch = cleanScoreSearch.match(
      /\b([A-Za-z][A-Za-z0-9]*(?:[\s-][A-Za-z][A-Za-z0-9]*){0,2}\s+(?:won\s+by\s+\d+\s+(?:runs?|wickets?|wkts?)|need[s]?\s+\d+\s+runs?(?:\s+in\s+\d+\s+(?:balls?|overs?))?|opt(?:ed)?\s+to\s+(?:bat|bowl|field)|chose\s+to\s+(?:bat|bowl|field)|elected\s+to\s+(?:bat|bowl|field))|innings?\s*break|drinks?\s*break|strategic\s*time\s*out|lunch\s*break|tea\s*break|rain\s*delay)/i
    );
    if (statusBannerMatch && statusBannerMatch[0]) {
      statusText = statusBannerMatch[0].replace(/,\s*.*$/, "").trim();
    }
  } else if (statusText) {
    statusText = statusText.replace(/<[^>]*>?/g, "").replace(/,\s*[A-Za-z0-9-]+\s+vs\s+[A-Za-z0-9-]+.*$/i, "").trim();
  }

  const isBreakStatus = /\b(?:innings?\s*break|drinks?\s*break|drinks?\b|strategic\s*time\s*out|time\s*out|lunch\s*break|lunch\b|tea\s*break|tea\b|dinner\s*break|stumps\b|rain\s*delay|rain\s*break|rain\s*stopped|bad\s*light|wet\s*outfield|interrupted|end\s+of\s+(?:1st|first)\s+innings)\b/i.test(
    `${statusText} | ${domStatusText}`
  );
  if (isBreakStatus) {
    isUpcoming = false;
  }

  let team1ScoreStr: string | undefined = undefined;
  let team2ScoreStr: string | undefined = undefined;
  let isFinishedMatch =
    !isBreakStatus &&
    (/\b(?:won\s+by|match\s+tied|match\s+drawn|no\s+result|abandoned|match\s+ended|match\s+completed)\b/i.test(`${combinedHeader} | ${statusText}`) ||
      statusText.includes("🏆"));

  // Detect match format / maxOvers from header & body (T10 / Super 60 / ODI / Test / T20)
  let detectedFormat: "10" | "20" | "50" | "100" | "test" = "20";
  let detectedMaxOvers = 20;
  if (/\b(?:t10|10\s*overs?|super\s*60)\b/i.test(combinedHeader + " " + bodyText.slice(0, 800))) {
    detectedFormat = "10";
    detectedMaxOvers = 10;
  } else if (/\b(?:odi|50\s*overs?|one\s*day|vijay\s*hazare|world\s*cup\s*odi)\b/i.test(combinedHeader)) {
    detectedFormat = "50";
    detectedMaxOvers = 50;
  } else if (/\b(?:100-ball|the\s*hundred)\b/i.test(combinedHeader)) {
    detectedFormat = "100";
    detectedMaxOvers = 20;
  }

  // Determine toss / chase batting team clues from statusText & scoreSearchText
  let clueBattingTeam: string | null = null;
  const fullClueSource = `${combinedHeader} | ${statusText} | ${bodyText.slice(0, 2000)}`;
  const resolveMultiWordTeamBeforeClue = (phrase: string): string | null => {
    const tokens = (phrase || "").trim().match(/[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*/g) || [];
    for (const count of [3, 2, 1]) {
      if (tokens.length >= count) {
        const cand = tokens.slice(-count).join("-");
        const matched = matchCricketTeamToken(cand, team1, team2);
        if (matched) return matched;
      }
    }
    return null;
  };
  const chaseClueMatch = fullClueSource.match(/\b([A-Za-z0-9]+(?:[\s-][A-Za-z0-9]+){0,3})\s+(?:need|needs|require|requires|trail)\s+\d+/i);
  const tossBatClueMatch = fullClueSource.match(/\b([A-Za-z0-9]+(?:[\s-][A-Za-z0-9]+){0,3})\s+(?:won\s+the\s+toss\s+and\s+)?(?:opt(?:ed)?|ch[oo]se|elect(?:ed)?)\s+to\s+bat\b/i);
  const tossBowlClueMatch = fullClueSource.match(/\b([A-Za-z0-9]+(?:[\s-][A-Za-z0-9]+){0,3})\s+(?:won\s+the\s+toss\s+and\s+)?(?:opt(?:ed)?|ch[oo]se|elect(?:ed)?)\s+to\s+(?:bowl|field)\b/i);

  if (chaseClueMatch && chaseClueMatch[1]) {
    clueBattingTeam = resolveMultiWordTeamBeforeClue(chaseClueMatch[1]);
  } else if (foundScores.length <= 1) {
    if (tossBatClueMatch && tossBatClueMatch[1]) {
      clueBattingTeam = resolveMultiWordTeamBeforeClue(tossBatClueMatch[1]);
    } else if (tossBowlClueMatch && tossBowlClueMatch[1]) {
      const bowlT = resolveMultiWordTeamBeforeClue(tossBowlClueMatch[1]);
      if (bowlT) {
        clueBattingTeam = bowlT.toLowerCase() === team1.toLowerCase() ? team2 : team1;
      }
    }
  }

  if (!isUpcoming && foundScores.length > 0) {
    // Assign explicit team1Score and team2Score when matched (including overs!)
    for (const fs of foundScores) {
      if (fs.matchedTeam && fs.matchedTeam.toLowerCase() === team1.toLowerCase() && !team1ScoreStr) {
        team1ScoreStr = fs.formattedWithOvers || fs.rawScoreStr;
      } else if (fs.matchedTeam && fs.matchedTeam.toLowerCase() === team2.toLowerCase() && !team2ScoreStr) {
        team2ScoreStr = fs.formattedWithOvers || fs.rawScoreStr;
      }
    }

    let activeScoreEntry = foundScores[0];
    let firstInningsEntry: typeof foundScores[0] | undefined = undefined;

    if (foundScores.length >= 2) {
      const firstEntry = foundScores[0];
      const secondEntry = foundScores[1];
      // On CREX, .team-inning #0 is ALWAYS the 2nd innings (active/chasing team) and .team-inning #1 is ALWAYS the 1st innings
      if (firstEntry.fromCrexInningIdx === 0 && secondEntry.fromCrexInningIdx === 1) {
        activeScoreEntry = firstEntry;
        firstInningsEntry = secondEntry;
      } else if (clueBattingTeam && secondEntry.matchedTeam === clueBattingTeam) {
        activeScoreEntry = secondEntry;
        firstInningsEntry = firstEntry;
      } else if (clueBattingTeam && firstEntry.matchedTeam === clueBattingTeam) {
        activeScoreEntry = firstEntry;
        firstInningsEntry = secondEntry;
      } else if (!firstEntry.hasOvers && secondEntry.hasOvers) {
        activeScoreEntry = secondEntry;
        firstInningsEntry = firstEntry;
      } else if (firstEntry.ov === detectedMaxOvers || firstEntry.wkts === 10 || (secondEntry.ov > 0 && secondEntry.ov < firstEntry.ov)) {
        activeScoreEntry = secondEntry;
        firstInningsEntry = firstEntry;
      } else {
        activeScoreEntry = firstEntry;
        firstInningsEntry = secondEntry;
      }

      if (firstInningsEntry) {
        firstInningsScore = firstInningsEntry.formattedWithOvers || `${firstInningsEntry.runs}/${firstInningsEntry.wkts}`;
        if (!target || target <= 25) target = firstInningsEntry.runs + 1;
      }
    }

    score = activeScoreEntry.runs;
    wickets = activeScoreEntry.wkts;
    overs = Math.floor(activeScoreEntry.ov);
    ballsInOver = activeScoreEntry.ballsInOv;
    if (activeScoreEntry.matchedTeam) {
      battingTeam = activeScoreEntry.matchedTeam;
    } else if (clueBattingTeam) {
      battingTeam = clueBattingTeam;
    }
  }

  if (clueBattingTeam && (!battingTeam || isGenericSiteTitle(battingTeam))) {
    battingTeam = clueBattingTeam;
  }

  if (!battingTeam || isGenericSiteTitle(battingTeam)) {
    battingTeam = team1;
  } else {
    const normalizedBat = matchCricketTeamToken(battingTeam, team1, team2);
    if (normalizedBat) battingTeam = normalizedBat;
  }

  bowlingTeam = battingTeam.toLowerCase() === team1.toLowerCase() ? team2 : team1;

  // Check "need X runs in Y balls" in scoreSearchText
  const needRegex = /\b(?:need|needs|require|requires)\s+(\d{1,3})\s+(?:runs|more)\b/i;
  const needMatch = scoreSearchText.match(needRegex);
  if (needMatch && needMatch[1] && !isUpcoming) {
    const needRuns = parseInt(needMatch[1], 10);
    if (score >= 0) {
      target = score + needRuns;
      if (!firstInningsScore && target > 1) {
        firstInningsScore = target - 1;
      }
    }
  }

  // Explicit target regex in scoreSearchText
  if ((!target || target <= 25) && !isUpcoming) {
    const targetExplicitRegex = /\b(?:target|target\s*is|tgt)\s*[:=]?\s*(\d{2,4})\b/i;
    const targetMatch = scoreSearchText.match(targetExplicitRegex);
    if (targetMatch && targetMatch[1]) {
      const parsedT = parseInt(targetMatch[1], 10);
      if (parsedT > 25) {
        target = parsedT;
        if (!firstInningsScore) {
          firstInningsScore = target - 1;
        }
      }
    }
  }

  if (!firstInningsScore && target && target > 25 && !isUpcoming) {
    firstInningsScore = target - 1;
  }

  // Ensure both teams' scores are populated when firstInningsScore is known
  if (!isUpcoming) {
    const isTeam2BattingNow = battingTeam.toLowerCase() === team2.toLowerCase();
    const activeWithOvStr = (overs > 0 || ballsInOver > 0) ? `${score}/${wickets} (${overs}.${ballsInOver})` : `${score}/${wickets}`;
    if (isTeam2BattingNow) {
      if (!team2ScoreStr) team2ScoreStr = activeWithOvStr;
      if (firstInningsScore !== undefined && !team1ScoreStr) {
        team1ScoreStr = String(firstInningsScore);
      } else if (team1ScoreStr && firstInningsScore === undefined) {
        firstInningsScore = team1ScoreStr;
      }
    } else {
      if (!team1ScoreStr) team1ScoreStr = activeWithOvStr;
      if (firstInningsScore !== undefined && !team2ScoreStr) {
        team2ScoreStr = String(firstInningsScore);
      } else if (team2ScoreStr && firstInningsScore === undefined) {
        firstInningsScore = team2ScoreStr;
      }
    }
  }

  // Extract full structured scorecard from CREX Angular SSR (#app-root-state: getSC4 + getHomeMapData + getSV3)
  let team1BattingStats: any[] = [];
  let team2BattingStats: any[] = [];
  let team1BowlingStats: any[] = [];
  let team2BowlingStats: any[] = [];
  let playerList1: string[] = [];
  let playerList2: string[] = [];
  let activeBattingStats: any[] = [];
  let activeBatsman1Idx: number | undefined = undefined;
  let activeBatsman2Idx: number | undefined = undefined;
  let onStrikeIdx: number | undefined = undefined;
  let liveBowlerStats: any = undefined;
  let liveBallEvent: string | undefined = undefined;
  let hasCrexSc4Started = false;

  const parseCrexAppRootState = (rawHtml: string): Record<string, any> | null => {
    if (!rawHtml) return null;
    const m = rawHtml.match(/<script[^>]*id="app-root-state"[^>]*>([\s\S]*?)<\/script>/i);
    if (!m || !m[1]) return null;
    try {
      const decoded = m[1]
        .replace(/&q;/g, '"')
        .replace(/&s;/g, "'")
        .replace(/&a;/g, "&")
        .replace(/&l;/g, "<")
        .replace(/&g;/g, ">");
      return JSON.parse(decoded);
    } catch {
      return null;
    }
  };

  const liveRootState = parseCrexAppRootState(html);
  const scRootState = crexScorecardHtml && crexScorecardHtml !== html
    ? parseCrexAppRootState(crexScorecardHtml)
    : liveRootState;
  const mergedCrexState: Record<string, any> = {
    ...(liveRootState || {}),
    ...(scRootState || {})
  };

  if (Object.keys(mergedCrexState).length > 0) {
    const playerMap: Record<string, string> = {};
    const teamMap: Record<string, { name: string; short: string }> = {};
    let crexTeam1Fkey = "";
    let crexTeam2Fkey = "";

    let crexMatchStatusCode: number | undefined = undefined;
    let crexFormatCode: number | undefined = undefined;

    for (const k of Object.keys(mergedCrexState)) {
      if ((k.startsWith("match-") || k.includes("getMatchMetaData")) && mergedCrexState[k] && typeof mergedCrexState[k] === "object") {
        const mObj = Array.isArray(mergedCrexState[k]) ? mergedCrexState[k][0] : mergedCrexState[k];
        if (!mObj || typeof mObj !== "object") continue;
        if (mObj.team1?.fkey) crexTeam1Fkey = String(mObj.team1.fkey).replace(/^t_/, "");
        if (mObj.team2?.fkey) crexTeam2Fkey = String(mObj.team2.fkey).replace(/^t_/, "");
        if (typeof mObj.s === "number" && crexMatchStatusCode === undefined) {
          crexMatchStatusCode = mObj.s;
        }
        if (typeof mObj.ft === "number" && crexFormatCode === undefined) {
          crexFormatCode = mObj.ft;
        }
        const rawSt = mObj.t ?? mObj.start_time ?? mObj.dateTimeGMT ?? mObj.startTime ?? mObj.st;
        if (rawSt) {
          const stNum = Number(rawSt);
          const isNumericEpoch = !isNaN(stNum) && stNum > 1000000000;
          if (isNumericEpoch || !matchStartTimeIso) {
            const d = isNumericEpoch
              ? new Date(stNum < 10000000000 ? stNum * 1000 : stNum)
              : new Date(String(rawSt));
            if (!isNaN(d.getTime())) {
              matchStartTimeIso = d.toISOString();
              if (!matchStartTime) {
                matchStartTime = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + ', ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              }
            }
          }
        }
      }
      if (k.includes("getHomeMapData")) {
        const md = mergedCrexState[k];
        if (md && Array.isArray(md.p)) {
          for (const p of md.p) {
            if (p && p.f_key && p.n) {
              playerMap[String(p.f_key).replace(/^p_/, "")] = String(p.n).trim();
            }
          }
        }
        if (md && Array.isArray(md.t)) {
          for (const t of md.t) {
            if (t && t.f_key) {
              const tKey = String(t.f_key).replace(/^t_/, "");
              teamMap[tKey] = {
                name: String(t.n || t.sn || tKey).trim(),
                short: String(t.sn || t.n || tKey).trim()
              };
            }
          }
        }
      }
    }

    const sv3Key = Object.keys(mergedCrexState).find(k => k.includes("getSV3"));
    const sc4Key = Object.keys(mergedCrexState).find(k => k.includes("getSC4"));
    const sv3 = sv3Key ? mergedCrexState[sv3Key] : null;
    const sc4 = sc4Key && Array.isArray(mergedCrexState[sc4Key]) ? mergedCrexState[sc4Key] : [];

    if (crexFormatCode === 3) {
      detectedFormat = "test";
      detectedMaxOvers = 90;
    } else if (crexFormatCode === 2) {
      detectedFormat = "50";
      detectedMaxOvers = 50;
    } else if (crexFormatCode === 4) {
      detectedFormat = "10";
      detectedMaxOvers = 10;
    } else if (crexFormatCode === 5) {
      detectedFormat = "100";
      detectedMaxOvers = 20;
    }

    const effectiveCrexStatus = crexMatchStatusCode ?? (typeof sv3?.status === "number" ? sv3.status : undefined);
    const hasSv3LiveScore = Boolean(sv3 && typeof sv3.score1 === "string" && sv3.score1.includes("-"));
    if (effectiveCrexStatus === 0 && sc4.length === 0 && !hasSv3LiveScore) {
      isUpcoming = true;
      isFinishedMatch = false;
      hasCrexSc4Started = false;
      foundScores.length = 0;
      score = 0;
      wickets = 0;
      overs = 0;
      ballsInOver = 0;
      target = 0;
      firstInningsScore = undefined;
      team1ScoreStr = undefined;
      team2ScoreStr = undefined;
      batsmen.length = 0;
      recentBalls.length = 0;
      if (statusText && /\b(?:won\s+by|need[s]?\s+\d+\s+runs?)\b/i.test(statusText)) {
        statusText = "";
      }
    }

    if (sv3 && typeof sv3 === "object" && !matchStartTimeIso) {
      const svSt = sv3.st ?? sv3.start_time ?? sv3.startTime;
      if (svSt) {
        const stNum = Number(svSt);
        const d = !isNaN(stNum) && stNum > 1000000000
          ? new Date(stNum < 10000000000 ? stNum * 1000 : stNum)
          : new Date(String(svSt));
        if (!isNaN(d.getTime())) {
          matchStartTimeIso = d.toISOString();
          if (!matchStartTime) {
            matchStartTime = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + ', ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          }
        }
      }
    }

    // Align crexTeam1Fkey and crexTeam2Fkey with URL/header team1 and team2 so innings changes never flip team1/team2 order
    for (const [tKey, tInfo] of Object.entries(teamMap)) {
      const matched =
        matchCricketTeamToken(tInfo.short, team1, team2) ||
        matchCricketTeamToken(tInfo.name, team1, team2);
      if (matched) {
        if (matched.toLowerCase() === team1.toLowerCase() && !crexTeam1Fkey) {
          crexTeam1Fkey = tKey;
        } else if (matched.toLowerCase() === team2.toLowerCase() && !crexTeam2Fkey) {
          crexTeam2Fkey = tKey;
        }
      }
    }

    if ((!crexTeam1Fkey || !crexTeam2Fkey) && sv3 && typeof sv3.a === "string" && sv3.a.includes(".")) {
      const aParts = sv3.a.split(".").map((x: string) => x.replace(/^t_/, "").trim()).filter(Boolean);
      if (aParts.length >= 2) {
        if (crexTeam1Fkey && !crexTeam2Fkey) {
          crexTeam2Fkey = aParts.find((k: string) => k !== crexTeam1Fkey) || aParts[1];
        } else if (crexTeam2Fkey && !crexTeam1Fkey) {
          crexTeam1Fkey = aParts.find((k: string) => k !== crexTeam2Fkey) || aParts[0];
        } else {
          crexTeam1Fkey = aParts[0];
          crexTeam2Fkey = aParts[1];
        }
      }
    }

    if (crexTeam1Fkey && teamMap[crexTeam1Fkey]?.short && isGenericSiteTitle(team1)) {
      team1 = teamMap[crexTeam1Fkey].short;
    }
    if (crexTeam2Fkey && teamMap[crexTeam2Fkey]?.short && isGenericSiteTitle(team2)) {
      team2 = teamMap[crexTeam2Fkey].short;
    }

    let onCreaseIds: string[] = [];
    let strikeBatterId = "";
    let crexBowlerId = "";
    let crexBowlerRaw = "";
    let sv3LastBallToken = "";
    let sv3LastWicketMethod = "";

    const normalizeCricketBallToken = (rawTok: string, wicketMethodHint = ""): string => {
      const t = (rawTok || "").replace(/<[^>]*>?/g, "").trim();
      if (!t) return "";
      if (/^(?:ball|ball\s*start|ball\s*in\s*air|bowling|bowler\s*running|in\s*air)$/i.test(t)) return "Ball";
      if (/^(?:0|•|\.|dot|dot\s*ball|0\s*runs?|no\s*run)$/i.test(t)) return "0";
      const runM = t.match(/^([1-6])(?:\s*runs?)?$/i);
      if (runM) return runM[1];
      if (/^four$/i.test(t)) return "4";
      if (/^six$/i.test(t)) return "6";

      // No Ball: NB, NB+1 .. NB+6, 1nb, nb6, etc.
      if (/^(?:nb|no\s*ball|0\s*nb|nb\s*\+?\s*0)$/i.test(t)) return "NB";
      const nbM = t.match(/^(?:(\d+)\s*(?:nb|no\s*ball)|(?:nb|no\s*ball)\s*\+?\s*(\d+))$/i);
      if (nbM) {
        const extraRuns = parseInt(nbM[1] || nbM[2] || "0", 10);
        // Note: in CREX overinfo, "nb" is 1 total run, "2nb" or "nb+1" or "7nb" (1+6) can appear; if extraRuns === 7, it's NB+6; if extraRuns === 5, NB+4
        if (extraRuns === 7) return "NB+6";
        if (extraRuns > 0) return `NB+${extraRuns}`;
        return "NB";
      }

      // Wide: WD, WD+1 .. WD+4, 1wd, wd4, etc.
      if (/^(?:wd|wide|wides|0\s*wd|wd\s*\+?\s*0)$/i.test(t)) return "WD";
      const wdM = t.match(/^(?:(\d+)\s*(?:wd|wide|wides)|(?:wd|wide|wides)\s*\+?\s*(\d+))$/i);
      if (wdM) {
        const extraRuns = parseInt(wdM[1] || wdM[2] || "0", 10);
        if (extraRuns === 5) return "WD+4";
        if (extraRuns > 0) return `WD+${extraRuns}`;
        return "WD";
      }

      // Leg Bye: Leg Bye, Leg Bye 2, Leg Bye 3, Leg Bye 4 (1lb, 2lb, 4lb, lb4, etc.)
      if (/^(?:lb|leg\s*bye|leg\s*byes|1\s*lb|lb\s*\+?\s*1|leg\s*bye\s*1)$/i.test(t)) return "Leg Bye";
      const lbM = t.match(/^(?:(\d+)\s*(?:lb|leg\s*bye|leg\s*byes)|(?:lb|leg\s*bye|leg\s*byes)\s*\+?\s*(\d+))$/i);
      if (lbM) {
        const r = parseInt(lbM[1] || lbM[2] || "1", 10);
        return r > 1 ? `Leg Bye ${r}` : "Leg Bye";
      }

      // Bye: Bye, Bye 2, Bye 3, Bye 4 (1b, 2b, 4b, by2, by4, etc.)
      if (/^(?:b|by|bye|byes|1\s*b|1\s*by|by\s*\+?\s*1|b\s*\+?\s*1|bye\s*1)$/i.test(t)) return "Bye";
      const byeM = t.match(/^(?:(\d+)\s*(?:b|by|bye|byes)|(?:b|by|bye|byes)\s*\+?\s*(\d+))$/i);
      if (byeM) {
        const r = parseInt(byeM[1] || byeM[2] || "1", 10);
        return r > 1 ? `Bye ${r}` : "Bye";
      }

      // Wickets & Specific Dismissal Types
      if (/^caught\b/i.test(t)) return "Caught";
      if (/^bowled\b/i.test(t)) return "Bowled";
      if (/^lbw\b/i.test(t)) return "LBW";
      if (/^run\s*out\b/i.test(t)) return "Run Out";
      if (/^stumped\b/i.test(t)) return "Stumped";
      if (/^hit\s*wicket\b/i.test(t)) return "Hit Wicket";
      if (/^(?:w|wkt|wicket|wickets|out)$/i.test(t)) {
        return wicketMethodHint || "Wickets";
      }
      return t;
    };

    if (sv3 && typeof sv3 === "object") {
      // Populate playerMap with live sv3 player names so even newly added squad members have full names
      if (typeof sv3.p1f === "string" && sv3.p1f.trim() && (sv3.player_full_name1 || sv3.pname1)) {
        const k1 = sv3.p1f.replace(/^p_/, "").trim();
        const full1 = String(sv3.player_full_name1 || sv3.pname1).trim();
        if (!playerMap[k1] || full1.length > playerMap[k1].length) playerMap[k1] = full1;
      }
      if (typeof sv3.p2f === "string" && sv3.p2f.trim() && (sv3.player_full_name2 || sv3.pname2)) {
        const k2 = sv3.p2f.replace(/^p_/, "").trim();
        const full2 = String(sv3.player_full_name2 || sv3.pname2).trim();
        if (!playerMap[k2] || full2.length > playerMap[k2].length) playerMap[k2] = full2;
      }
      if (typeof sv3.b === "string" && sv3.b.trim() && (sv3.bowler_full_name || sv3.bname)) {
        const kb = sv3.b.split(".")[0].replace(/^p_/, "").trim();
        const fullB = String(sv3.bowler_full_name || sv3.bname).trim();
        if (!playerMap[kb] || fullB.length > playerMap[kb].length) playerMap[kb] = fullB;
      }
      if (typeof sv3.lwfkey === "string" && sv3.lwfkey.trim() && sv3.lwname1) {
        const klw = sv3.lwfkey.replace(/^p_/, "").trim();
        const fullLw = String(sv3.lwname1).trim();
        if (!playerMap[klw] || fullLw.length > playerMap[klw].length) playerMap[klw] = fullLw;
      }

      // Extract last wicket dismissal method from sv3.x (e.g. "QDJ.1.6.5.12.0.2")
      if (typeof sv3.x === "string" && sv3.x.includes(".")) {
        const xParts = sv3.x.split(".");
        const outCode = xParts[6];
        if (outCode === "1") sv3LastWicketMethod = "Bowled";
        else if (outCode === "2") sv3LastWicketMethod = "Caught";
        else if (outCode === "3") sv3LastWicketMethod = "LBW";
        else if (outCode === "4") sv3LastWicketMethod = "Run Out";
        else if (outCode === "5") sv3LastWicketMethod = "Stumped";
        else if (outCode === "6") sv3LastWicketMethod = "Hit Wicket";
      }

      // Extract recent balls from sv3.lastovers or sv3.rb
      if (Array.isArray(sv3.lastovers) && sv3.lastovers.length > 0) {
        const latestOverObj = sv3.lastovers[sv3.lastovers.length - 1];
        if (latestOverObj && Array.isArray(latestOverObj.overinfo) && latestOverObj.overinfo.length > 0) {
          const rawOverBalls = latestOverObj.overinfo.map((x: any) => String(x || "").trim()).filter(Boolean);
          if (rawOverBalls.length > 0) {
            sv3LastBallToken = rawOverBalls[rawOverBalls.length - 1];
            if (recentBalls.length === 0) {
              for (const rbTok of rawOverBalls.slice(-8)) {
                recentBalls.push(normalizeCricketBallToken(rbTok, sv3LastWicketMethod));
              }
            }
          }
        }
      }

      if (typeof sv3.comment1 === "string" && sv3.comment1.trim() && !statusText) {
        statusText = sv3.comment1.trim();
      }

      if (typeof sv3.B === "string" && sv3.B.trim()) {
        const candB = sv3.B.trim();
        if (/\b(?:won\s+by|innings\s+break|match\s+tied|match\s+drawn|no\s+result|abandoned|completed|stumps|lunch|tea|delayed|need[s]?\s+\d+|opt(?:ed)?\s+to|elected\s+to)\b/i.test(candB) || candB.includes("🏆")) {
          statusText = candB;
        }
        if (/\b(?:won\s+by|match\s+tied|match\s+drawn|no\s+result|abandoned|completed)\b/i.test(candB) || candB.includes("🏆")) {
          isFinishedMatch = true;
        }
        // If sv3.B is generic "Run", "Over", or "Boundary Check", prefer the actual last ball token if available
        if (/^(?:run|runs|boundary\s*check)$/i.test(candB) && sv3LastBallToken) {
          liveBallEvent = normalizeCricketBallToken(sv3LastBallToken, sv3LastWicketMethod);
        } else if (/^(?:over|ov)$/i.test(candB) && sv3LastBallToken) {
          liveBallEvent = normalizeCricketBallToken(sv3LastBallToken, sv3LastWicketMethod);
        } else {
          liveBallEvent = normalizeCricketBallToken(candB, sv3LastWicketMethod);
        }
      } else if (sv3LastBallToken) {
        liveBallEvent = normalizeCricketBallToken(sv3LastBallToken, sv3LastWicketMethod);
      }

      if (typeof sv3.mt === "string") {
        const mtUpper = sv3.mt.toUpperCase();
        if (mtUpper.includes("T10") || mtUpper === "10") {
          detectedFormat = "10";
          detectedMaxOvers = 10;
        } else if (mtUpper.includes("ODI") || mtUpper === "50") {
          detectedFormat = "50";
          detectedMaxOvers = 50;
        } else if (mtUpper.includes("100")) {
          detectedFormat = "100";
          detectedMaxOvers = 20;
        } else if (mtUpper.includes("T20") || mtUpper === "20") {
          detectedFormat = "20";
          detectedMaxOvers = 20;
        }
      }
      // Extract active on-crease batter IDs: prefer sv3.p1f & sv3.p2f (note: sv3.p is partnership "18.27" in CREX, only use sv3.p if tokens contain alphabetic player f_keys)
      const p1IdFromSv3 = sv3.p1f ? String(sv3.p1f).replace(/^p_/, "").replace(/\*/g, "").trim() : "";
      const p2IdFromSv3 = sv3.p2f ? String(sv3.p2f).replace(/^p_/, "").replace(/\*/g, "").trim() : "";
      if (p1IdFromSv3) onCreaseIds.push(p1IdFromSv3);
      if (p2IdFromSv3 && p2IdFromSv3 !== p1IdFromSv3) onCreaseIds.push(p2IdFromSv3);

      if (typeof sv3.p === "string" && sv3.p.trim()) {
        const rawTokens = sv3.p.split(".").map((s: string) => s.trim()).filter(Boolean);
        const alphaTokens = rawTokens.filter((tok: string) => /[A-Za-z]/.test(tok));
        if (alphaTokens.length > 0) {
          for (const tok of alphaTokens) {
            const cleanId = tok.replace(/^p_/, "").replace(/\*/g, "").trim();
            if (tok.includes("*")) strikeBatterId = cleanId;
            if (cleanId && !onCreaseIds.includes(cleanId)) onCreaseIds.push(cleanId);
          }
        }
      }

      // Determine on-strike batter from sv3.os1 / sv3.os2 (1 = on strike, 0 = non-striker) or sv3.s ("8.14*.1.0/10.13.1.0")
      if (!strikeBatterId) {
        const p1Id = p1IdFromSv3 || onCreaseIds[0] || "";
        const p2Id = p2IdFromSv3 || onCreaseIds[1] || "";
        if (Number(sv3.os1) === 1 || sv3.os1 === true) {
          strikeBatterId = p1Id;
        } else if (Number(sv3.os2) === 1 || sv3.os2 === true) {
          strikeBatterId = p2Id;
        } else if (typeof sv3.s === "string" && sv3.s.includes("*")) {
          if (sv3.s.includes("/")) {
            const sHalves = sv3.s.split("/");
            if (sHalves[0]?.includes("*")) strikeBatterId = p1Id;
            else if (sHalves[1]?.includes("*")) strikeBatterId = p2Id;
          } else {
            const sParts = sv3.s.split(".");
            if (sParts[0]?.includes("*")) strikeBatterId = p1Id;
            else if (sParts[1]?.includes("*")) strikeBatterId = p2Id;
          }
        } else if (String(sv3.ball1 || "").includes("*") || String(sv3.run1 || "").includes("*")) {
          strikeBatterId = p1Id;
        } else if (String(sv3.ball2 || "").includes("*") || String(sv3.run2 || "").includes("*")) {
          strikeBatterId = p2Id;
        } else if (typeof sv3.os1 === "string" && sv3.os1.trim() && sv3.os1 !== "0") {
          strikeBatterId = sv3.os1.replace(/^p_/, "").replace(/\*/g, "").trim();
        }
      }
      if (typeof sv3.b === "string" && sv3.b.trim()) {
        crexBowlerRaw = sv3.b.trim();
        crexBowlerId = crexBowlerRaw.split(".")[0].replace(/^p_/, "").replace(/\*/g, "").trim();
      } else if (typeof sv3.q === "string" && sv3.q.trim()) {
        crexBowlerRaw = sv3.q.trim();
        crexBowlerId = crexBowlerRaw.split(".")[0].replace(/^p_/, "").replace(/\*/g, "").trim();
      }
    }

    const decodeCrexBowler = (raw: string, bpo: number) => {
      const beforeSlash = String(raw || "").split("/")[0] || "";
      const parts = beforeSlash.split(".");
      const pId = (parts[0] || "").replace(/^p_/, "").replace(/\*/g, "").trim();
      const mappedName = playerMap[pId];
      const name = mappedName || pId || "Bowler";
      const isRawUnmappedCode = !mappedName && /^[A-Z0-9]{1,4}$/i.test(pId);
      const runsVal = parseInt(parts[1] || "0", 10) || 0;
      const ballsVal = parseInt(parts[2] || "0", 10) || 0;
      const maidensVal = parseInt(parts[3] || "0", 10) || 0;
      const wicketsVal = parseInt(parts[4] || "0", 10) || 0;
      const ovWhole = Math.floor(ballsVal / bpo);
      const ovRem = ballsVal % bpo;
      const oversStr = `${ovWhole}.${ovRem}`;
      const oversDec = ballsVal / bpo;
      const econStr = oversDec > 0 ? (runsVal / oversDec).toFixed(2) : "0.00";
      return {
        pId,
        name,
        isRawUnmappedCode,
        wickets: wicketsVal,
        runs: runsVal,
        balls: ballsVal,
        overs: oversStr,
        maidens: maidensVal,
        economy: econStr
      };
    };

    const decodeCrexBatter = (raw: string) => {
      const beforeSlash = String(raw || "").split("/")[0] || "";
      const parts = beforeSlash.split(".");
      const pId = (parts[0] || "").replace(/\*/g, "").trim();
      const mappedName = playerMap[pId];
      const name = mappedName || pId || "Player";
      const isRawUnmappedCode = !mappedName && /^[A-Z0-9]{1,4}$/i.test(pId);
      if (parts.length <= 1) {
        return {
          pId,
          name,
          isRawUnmappedCode,
          runs: 0,
          balls: 0,
          fours: 0,
          sixes: 0,
          isOut: false,
          yetToBat: true
        };
      }
      const runsVal = parseInt(parts[1], 10) || 0;
      const ballsVal = parseInt(parts[2], 10) || 0;
      const foursVal = parseInt(parts[3], 10) || 0;
      const sixesVal = parseInt(parts[4], 10) || 0;
      if (parts.length <= 5) {
        return {
          pId,
          name,
          isRawUnmappedCode,
          runs: runsVal,
          balls: ballsVal,
          fours: foursVal,
          sixes: sixesVal,
          isOut: false,
          yetToBat: false,
          wicketType: "not out"
        };
      }
      const outCode = parts[7];
      const bowlerName = parts[8] ? (playerMap[parts[8]] || parts[8]) : "";
      const fielderName = parts[9] ? (playerMap[parts[9]] || parts[9]) : "";
      let wicketType = "out";
      if (outCode === "1") wicketType = bowlerName ? `b ${bowlerName}` : "bowled";
      else if (outCode === "2") {
        if (fielderName && bowlerName && fielderName === bowlerName) wicketType = `c & b ${bowlerName}`;
        else if (fielderName && bowlerName) wicketType = `c ${fielderName} b ${bowlerName}`;
        else if (bowlerName) wicketType = `c b ${bowlerName}`;
        else wicketType = "caught";
      } else if (outCode === "3") wicketType = bowlerName ? `lbw b ${bowlerName}` : "lbw";
      else if (outCode === "4") wicketType = fielderName ? `run out (${fielderName})` : (bowlerName ? `run out (${bowlerName})` : "run out");
      else if (outCode === "5") wicketType = (fielderName && bowlerName) ? `st ${fielderName} b ${bowlerName}` : "stumped";
      else if (outCode === "6") wicketType = bowlerName ? `hit wicket b ${bowlerName}` : "hit wicket";
      else if (outCode === "7") wicketType = "retired hurt";
      else if (outCode === "8") wicketType = "retired out";

      return {
        pId,
        name,
        isRawUnmappedCode,
        runs: runsVal,
        balls: ballsVal,
        fours: foursVal,
        sixes: sixesVal,
        isOut: outCode !== "7",
        yetToBat: false,
        wicketType
      };
    };

    if (sc4.length > 0) {
      const bpo = detectedFormat === "100" ? 5 : 6;
      const parsedInningsList: Array<{
        idx: number;
        tId: string;
        isTeam1Innings: boolean;
        cleanStats: any[];
        decodedBatters: any[];
        decodedBowlers: any[];
        innRuns: number;
        innWkts: number;
        innOvWhole: number;
        innOvBalls: number;
        innTotalBalls: number;
        innFormattedScore?: string;
        hasStarted: boolean;
      }> = [];

      let firstAssignedTeam1: boolean | null = null;
      let firstAssignedTid = "";

      for (let idx = 0; idx < sc4.length; idx++) {
        const inn = sc4[idx];
        if (!inn || typeof inn !== "object") continue;
        const tId = String(inn.c || "").replace(/^t_/, "");
        const tInfo = teamMap[tId] || { name: tId, short: tId };
        const rawBatters = Array.isArray(inn.b) ? inn.b : [];
        const decodedBatters = rawBatters
          .map((bStr: string) => decodeCrexBatter(bStr))
          .filter((bObj: any) => bObj && bObj.name && !/^\d+$/.test(bObj.name) && !(bObj.yetToBat && bObj.isRawUnmappedCode));
        const rawBowlers = Array.isArray(inn.a) ? inn.a : [];
        const decodedBowlers = rawBowlers
          .map((bwStr: string) => decodeCrexBowler(bwStr, bpo))
          .filter((bwObj: any) => bwObj && bwObj.name && !bwObj.isRawUnmappedCode);

        // Append any extra yet-to-bat IDs from inn.f if not already in inn.b (only if mapped to a real player name)
        if (Array.isArray(inn.f)) {
          for (const yIdRaw of inn.f) {
            const yId = String(yIdRaw || "").replace(/^p_/, "").trim();
            if (!yId || !playerMap[yId]) continue;
            const yName = playerMap[yId];
            if (!decodedBatters.some((x: any) => x.pId === yId || x.name === yName)) {
              decodedBatters.push({
                pId: yId,
                name: yName,
                runs: 0,
                balls: 0,
                fours: 0,
                sixes: 0,
                isOut: false,
                yetToBat: true
              });
            }
          }
        }

        // Format innings score e.g. "101/10(55" -> "101/10 (9.1)"
        let innFormattedScore: string | undefined = undefined;
        let innRuns = 0;
        let innWkts = 0;
        let innOvWhole = 0;
        let innOvBalls = 0;
        let innTotalBalls = 0;
        if (typeof inn.d === "string" && inn.d.trim()) {
          const dm = inn.d.trim().match(/^(\d{1,3})\/(\d{1,2})(?:\((\d+(?:\.\d+)?))?/);
          if (dm) {
            innRuns = parseInt(dm[1], 10) || 0;
            innWkts = parseInt(dm[2], 10) || 0;
            const ballOrOvStr = dm[3] || "";
            if (ballOrOvStr) {
              if (ballOrOvStr.includes(".")) {
                const [ow, ob] = ballOrOvStr.split(".");
                innOvWhole = parseInt(ow || "0", 10) || 0;
                innOvBalls = parseInt(ob || "0", 10) || 0;
                innTotalBalls = innOvWhole * bpo + innOvBalls;
                innFormattedScore = `${innRuns}/${innWkts} (${innOvWhole}.${innOvBalls})`;
              } else {
                innTotalBalls = parseInt(ballOrOvStr, 10) || 0;
                innOvWhole = Math.floor(innTotalBalls / bpo);
                innOvBalls = innTotalBalls % bpo;
                innFormattedScore = `${innRuns}/${innWkts} (${innOvWhole}.${innOvBalls})`;
              }
            } else {
              innFormattedScore = `${innRuns}/${innWkts}`;
            }
          }
        }

        const hasStarted = innRuns > 0 || innWkts > 0 || innTotalBalls > 0 || decodedBatters.some((b: any) => !b.yetToBat && (b.runs > 0 || b.balls > 0 || b.isOut));

        // Match this innings to team1 or team2 using exact CREX f_key first, then name/short token
        let isTeam1Innings: boolean;
        if (crexTeam1Fkey && tId === crexTeam1Fkey) {
          isTeam1Innings = true;
        } else if (crexTeam2Fkey && tId === crexTeam2Fkey) {
          isTeam1Innings = false;
        } else {
          const matchedToTeam =
            matchCricketTeamToken(tInfo.short, team1, team2) ||
            matchCricketTeamToken(tInfo.name, team1, team2);
          if (matchedToTeam) {
            isTeam1Innings = matchedToTeam.toLowerCase() === team1.toLowerCase();
          } else if (firstAssignedTeam1 !== null && tId !== firstAssignedTid) {
            isTeam1Innings = !firstAssignedTeam1;
          } else {
            isTeam1Innings = idx === 0;
          }
        }

        // Prevent 2nd innings with a different team f_key from ever overwriting 1st innings team slot
        if (idx === 1 && firstAssignedTeam1 !== null && tId !== firstAssignedTid && isTeam1Innings === firstAssignedTeam1) {
          isTeam1Innings = !firstAssignedTeam1;
        }
        if (idx === 0) {
          firstAssignedTeam1 = isTeam1Innings;
          firstAssignedTid = tId;
        }

        const cleanStats = decodedBatters.map(({ pId: _pId, isRawUnmappedCode: _raw, ...rest }: any) => rest);

        parsedInningsList.push({
          idx,
          tId,
          isTeam1Innings,
          cleanStats,
          decodedBatters,
          decodedBowlers,
          innRuns,
          innWkts,
          innOvWhole,
          innOvBalls,
          innTotalBalls,
          innFormattedScore,
          hasStarted
        });
      }

      if (parsedInningsList.some(i => i.hasStarted)) {
        hasCrexSc4Started = true;
        isUpcoming = false;
        team1ScoreStr = undefined;
        team2ScoreStr = undefined;
        firstInningsScore = undefined;
      }

      // Determine active innings (use 2nd innings if it has started, otherwise 1st innings)
      const isSecondInningsStarted =
        (parsedInningsList.length >= 2 && parsedInningsList[parsedInningsList.length - 1].hasStarted) ||
        Boolean(sv3 && (Number(sv3.inning) === 2 || sv3.secondHalf === true));

      // If 2nd innings has started in sv3 (getSV3) before getSC4 has added the 2nd innings object, append the 2nd innings entry so 1st innings score/target is preserved!
      if (isSecondInningsStarted && parsedInningsList.length === 1 && parsedInningsList[0].hasStarted) {
        const firstInn = parsedInningsList[0];
        const secondTid = firstInn.isTeam1Innings ? (crexTeam2Fkey || "t2") : (crexTeam1Fkey || "t1");
        parsedInningsList.push({
          idx: 1,
          tId: secondTid,
          isTeam1Innings: !firstInn.isTeam1Innings,
          cleanStats: [],
          decodedBatters: [],
          decodedBowlers: [],
          innRuns: 0,
          innWkts: 0,
          innOvWhole: 0,
          innOvBalls: 0,
          innTotalBalls: 0,
          innFormattedScore: undefined,
          hasStarted: true
        });
      }

      const activeInn =
        isSecondInningsStarted && parsedInningsList.length >= 2
          ? parsedInningsList[parsedInningsList.length - 1]
          : parsedInningsList[0];

      // Sync real-time score, overs, batters, and bowler from sv3 into activeInn if sv3 is fresher than sc4
      if (activeInn && sv3 && typeof sv3 === "object" && !isFinishedMatch) {
        if (typeof sv3.score1 === "string" && sv3.score1.includes("-")) {
          const [sRunsStr, sWktsStr] = sv3.score1.split("-");
          const sRuns = parseInt(sRunsStr, 10);
          const sWkts = parseInt(sWktsStr, 10);
          const sOverStr = typeof sv3.over1 === "string" ? sv3.over1.trim() : "";
          const [sOwStr, sObStr] = sOverStr.split(".");
          const sOw = parseInt(sOwStr || "0", 10) || 0;
          const sOb = parseInt(sObStr || "0", 10) || 0;
          const sTotalBalls = sOw * bpo + sOb;
          if (!isNaN(sRuns) && !isNaN(sWkts) && (sTotalBalls >= activeInn.innTotalBalls || sRuns >= activeInn.innRuns)) {
            activeInn.innRuns = sRuns;
            activeInn.innWkts = sWkts;
            activeInn.innOvWhole = sOw;
            activeInn.innOvBalls = sOb;
            activeInn.innTotalBalls = sTotalBalls;
            activeInn.innFormattedScore = `${sRuns}/${sWkts} (${sOw}.${sOb})`;
            activeInn.hasStarted = activeInn.hasStarted || sRuns > 0 || sWkts > 0 || sTotalBalls > 0;
          }
        }

        // Sync live batter 1 and batter 2 stats from sv3 into activeInn.decodedBatters
        const syncSv3Batter = (pIdRaw: any, nameFallback: any, rRaw: any, bRaw: any, f4Raw: any, s6Raw: any) => {
          const pId = String(pIdRaw || "").replace(/^p_/, "").trim();
          if (!pId && !nameFallback) return;
          const bName = playerMap[pId] || String(nameFallback || pId).trim();
          const rVal = parseInt(String(rRaw ?? "0").replace(/\D/g, ""), 10) || 0;
          const bVal = parseInt(String(bRaw ?? "0").replace(/\D/g, ""), 10) || 0;
          const f4Val = parseInt(String(f4Raw ?? "0").replace(/\D/g, ""), 10) || 0;
          const s6Val = parseInt(String(s6Raw ?? "0").replace(/\D/g, ""), 10) || 0;
          const existingIdx = activeInn.decodedBatters.findIndex((x: any) => (pId && x.pId === pId) || x.name.toLowerCase() === bName.toLowerCase());
          if (existingIdx !== -1) {
            const cur = activeInn.decodedBatters[existingIdx];
            if (bVal >= cur.balls || rVal >= cur.runs || cur.yetToBat) {
              activeInn.decodedBatters[existingIdx] = {
                ...cur,
                name: bName,
                runs: rVal,
                balls: bVal,
                fours: f4Val,
                sixes: s6Val,
                isOut: false,
                yetToBat: false,
                wicketType: "not out"
              };
            }
          } else if (bName && !/^[A-Z0-9]{1,4}$/i.test(bName)) {
            activeInn.decodedBatters.push({
              pId: pId || bName,
              name: bName,
              runs: rVal,
              balls: bVal,
              fours: f4Val,
              sixes: s6Val,
              isOut: false,
              yetToBat: false,
              wicketType: "not out"
            });
          }
        };

        if (sv3.p1f || sv3.player_full_name1 || sv3.pname1) {
          syncSv3Batter(sv3.p1f, sv3.player_full_name1 || sv3.pname1, sv3.run1, sv3.ball1, sv3.four1, sv3.six1);
        }
        if (sv3.p2f || sv3.player_full_name2 || sv3.pname2) {
          syncSv3Batter(sv3.p2f, sv3.player_full_name2 || sv3.pname2, sv3.run2, sv3.ball2, sv3.four2, sv3.six2);
        }
        activeInn.cleanStats = activeInn.decodedBatters.map(({ pId: _pId, isRawUnmappedCode: _raw, ...rest }: any) => rest);

        // Sync live bowler from sv3 (bwr: "1-11", bover: "1.4", beco: "6.60")
        if ((sv3.bowler_full_name || sv3.bname) && typeof sv3.bwr === "string" && sv3.bwr.includes("-")) {
          const bwName = String(sv3.bowler_full_name || sv3.bname).trim();
          const bwId = String(sv3.b || "").split(".")[0].replace(/^p_/, "").trim();
          const [wStr, rStr] = sv3.bwr.split("-");
          const wVal = parseInt(wStr, 10) || 0;
          const rVal = parseInt(rStr, 10) || 0;
          const ovStr = String(sv3.bover || "0.0").replace(/[()]/g, "").trim();
          const [bwOw, bwOb] = ovStr.split(".");
          const bwBalls = (parseInt(bwOw || "0", 10) || 0) * bpo + (parseInt(bwOb || "0", 10) || 0);
          const econStr = String(sv3.beco || (bwBalls > 0 ? (rVal / (bwBalls / bpo)).toFixed(2) : "0.00"));
          const existingBwIdx = activeInn.decodedBowlers.findIndex((x: any) => (bwId && x.pId === bwId) || x.name.toLowerCase() === bwName.toLowerCase());
          if (existingBwIdx !== -1) {
            activeInn.decodedBowlers[existingBwIdx] = {
              ...activeInn.decodedBowlers[existingBwIdx],
              name: bwName,
              wickets: wVal,
              runs: rVal,
              balls: bwBalls,
              overs: ovStr,
              economy: econStr
            };
          } else {
            activeInn.decodedBowlers.push({
              pId: bwId || bwName,
              name: bwName,
              isRawUnmappedCode: false,
              wickets: wVal,
              runs: rVal,
              balls: bwBalls,
              overs: ovStr,
              maidens: 0,
              economy: econStr
            });
          }
        }
      }

      for (const pInn of parsedInningsList) {
        const cleanBowlers = pInn.decodedBowlers.map(({ pId: _pId, isRawUnmappedCode: _raw, balls: _balls, ...rest }: any) => rest);
        if (pInn.isTeam1Innings) {
          if (pInn.cleanStats.length > 0) {
            team1BattingStats = pInn.cleanStats;
            playerList1 = pInn.cleanStats.map((p: any) => p.name);
          }
          if (cleanBowlers.length > 0) {
            team1BowlingStats = cleanBowlers;
          }
          if (pInn.innFormattedScore && pInn.hasStarted) team1ScoreStr = pInn.innFormattedScore;
        } else {
          if (pInn.cleanStats.length > 0) {
            team2BattingStats = pInn.cleanStats;
            playerList2 = pInn.cleanStats.map((p: any) => p.name);
          }
          if (cleanBowlers.length > 0) {
            team2BowlingStats = cleanBowlers;
          }
          if (pInn.innFormattedScore && pInn.hasStarted) team2ScoreStr = pInn.innFormattedScore;
        }
      }

      // Only set firstInningsScore and target if 2nd innings has started OR 1st innings is completed
      const isFirstInningsCompleted =
        isSecondInningsStarted ||
        Boolean(
          parsedInningsList[0]?.hasStarted &&
          (parsedInningsList[0].innWkts >= 10 ||
           parsedInningsList[0].innTotalBalls >= detectedMaxOvers * bpo ||
           /\binnings\s+break\b/i.test(statusText))
        );

      if (isFirstInningsCompleted && parsedInningsList[0]?.hasStarted) {
        if (parsedInningsList[0].innFormattedScore) {
          firstInningsScore = parsedInningsList[0].innFormattedScore;
        }
        if (parsedInningsList[0].innRuns > 0) {
          target = parsedInningsList[0].innRuns + 1;
        }
        if (!isSecondInningsStarted && !isFinishedMatch) {
          isUpcoming = false;
          if (!statusText || !/\b(?:break|target|need|won)\b/i.test(statusText)) {
            statusText = `Innings Break • Target: ${target}`;
          }
        }
      } else {
        // 1st innings still in progress: no target and no 1st innings completed score
        firstInningsScore = undefined;
        target = 0;
        if (activeInn) {
          if (activeInn.isTeam1Innings) team2ScoreStr = undefined;
          else team1ScoreStr = undefined;
        }
      }

      if (activeInn) {
        battingTeam = activeInn.isTeam1Innings ? team1 : team2;
        bowlingTeam = activeInn.isTeam1Innings ? team2 : team1;
        if (activeInn.hasStarted) {
          score = activeInn.innRuns;
          wickets = activeInn.innWkts;
          overs = activeInn.innOvWhole;
          ballsInOver = activeInn.innOvBalls;
          isUpcoming = false;
        }
        if (activeInn !== parsedInningsList[0] && target && target > 0) {
          if (score >= target) {
            isFinishedMatch = true;
            if (!statusText || /^(?:over|ov)$/i.test(statusText)) {
              statusText = `${battingTeam} won by ${Math.max(1, 10 - wickets)} wickets 🏆`;
            }
          } else if (!isFinishedMatch && (!statusText || /^(?:over|ov)$/i.test(statusText))) {
            const ballsRem = Math.max(0, detectedMaxOvers * bpo - activeInn.innTotalBalls);
            if (ballsRem > 0) {
              statusText = `${battingTeam} need ${target - score} runs in ${ballsRem} balls`;
            }
          }
        }
        activeBattingStats = activeInn.cleanStats;
        const notOutBatters = activeInn.decodedBatters
          .map((bObj: any, bIdx: number) => ({ ...bObj, bIdx }))
          .filter((bObj: any) => !bObj.isOut && !bObj.yetToBat);

        if (onCreaseIds.length > 0) {
          const b1NameFallback = String(sv3?.player_full_name1 || sv3?.pname1 || playerMap[onCreaseIds[0]] || "").trim().toLowerCase();
          const b2NameFallback = onCreaseIds[1] ? String(sv3?.player_full_name2 || sv3?.pname2 || playerMap[onCreaseIds[1]] || "").trim().toLowerCase() : "";
          const idx1 = activeInn.decodedBatters.findIndex(
            (bObj: any) => !bObj.isOut && (bObj.pId === onCreaseIds[0] || (b1NameFallback && bObj.name.toLowerCase() === b1NameFallback))
          );
          const idx2 = onCreaseIds[1]
            ? activeInn.decodedBatters.findIndex(
                (bObj: any, i: number) => i !== idx1 && !bObj.isOut && (bObj.pId === onCreaseIds[1] || (b2NameFallback && bObj.name.toLowerCase() === b2NameFallback))
              )
            : -1;
          if (idx1 !== -1) activeBatsman1Idx = idx1;
          if (idx2 !== -1) activeBatsman2Idx = idx2;
        }
        if (activeBatsman1Idx === undefined && notOutBatters[0]) activeBatsman1Idx = notOutBatters[0].bIdx;
        if (activeBatsman2Idx === undefined && notOutBatters[1]) activeBatsman2Idx = notOutBatters[1].bIdx;

        if (strikeBatterId) {
          const b1Obj = activeBatsman1Idx !== undefined ? activeInn.decodedBatters[activeBatsman1Idx] : undefined;
          const b2Obj = activeBatsman2Idx !== undefined ? activeInn.decodedBatters[activeBatsman2Idx] : undefined;
          const strikeName = (playerMap[strikeBatterId] || "").toLowerCase();
          if (b2Obj && (strikeBatterId === b2Obj.pId || (strikeName && b2Obj.name.toLowerCase() === strikeName))) {
            onStrikeIdx = 1;
          } else if (b1Obj && (strikeBatterId === b1Obj.pId || (strikeName && b1Obj.name.toLowerCase() === strikeName))) {
            onStrikeIdx = 0;
          }
        }

        // Resolve active bowler and bowler stats from activeInn.decodedBowlers or sv3
        let chosenBowlerObj: any = null;
        if (crexBowlerId && activeInn.decodedBowlers.length > 0) {
          chosenBowlerObj = activeInn.decodedBowlers.find((bw: any) => bw.pId === crexBowlerId);
        }
        if (!chosenBowlerObj && crexBowlerRaw && crexBowlerRaw.includes(".")) {
          const parsedFromSv3 = decodeCrexBowler(crexBowlerRaw, bpo);
          if (!parsedFromSv3.isRawUnmappedCode) chosenBowlerObj = parsedFromSv3;
        }
        if (!chosenBowlerObj && activeInn.decodedBowlers.length > 0) {
          // Pick bowler currently mid-over, or last bowler in the bowling list
          const midOverBowler = [...activeInn.decodedBowlers].reverse().find((bw: any) => bw.balls > 0 && bw.balls % bpo !== 0);
          chosenBowlerObj = midOverBowler || activeInn.decodedBowlers[activeInn.decodedBowlers.length - 1];
        }
        if (chosenBowlerObj) {
          bowler = chosenBowlerObj.name;
          liveBowlerStats = {
            name: chosenBowlerObj.name,
            wickets: chosenBowlerObj.wickets,
            runs: chosenBowlerObj.runs,
            overs: chosenBowlerObj.overs,
            maidens: chosenBowlerObj.maidens,
            economy: chosenBowlerObj.economy
          };
        }

        batsmen.length = 0;
        for (const nob of notOutBatters.slice(0, 2)) {
          batsmen.push({
            name: nob.name,
            runs: nob.runs,
            balls: nob.balls,
            fours: nob.fours,
            sixes: nob.sixes,
            isOut: false
          });
        }
      }
    } else if (sv3 && typeof sv3 === "object" && !hasExplicitUpcomingText) {
      // Fallback when getSC4 is not yet populated (e.g. start of match) but getSV3 has live score/batters/bowler
      const bpo = detectedFormat === "100" ? 5 : 6;
      if (typeof sv3.score1 === "string" && sv3.score1.includes("-")) {
        const [sRunsStr, sWktsStr] = sv3.score1.split("-");
        const sRuns = parseInt(sRunsStr, 10);
        const sWkts = parseInt(sWktsStr, 10);
        const sOverStr = typeof sv3.over1 === "string" ? sv3.over1.trim() : "";
        const [sOwStr, sObStr] = sOverStr.split(".");
        const sOw = parseInt(sOwStr || "0", 10) || 0;
        const sOb = parseInt(sObStr || "0", 10) || 0;
        const sTotalBalls = sOw * bpo + sOb;
        if (!isNaN(sRuns) && !isNaN(sWkts) && (sRuns > 0 || sWkts > 0 || sTotalBalls > 0 || hasLiveBreakOrPlayClue)) {
          hasCrexSc4Started = true;
          isUpcoming = false;
          score = sRuns;
          wickets = sWkts;
          overs = sOw;
          ballsInOver = sOb;
          if (typeof sv3.a === "string" && sv3.a.includes(".")) {
            const batKey = sv3.a.split(".")[0].replace(/^t_/, "").trim();
            if (batKey && crexTeam2Fkey && batKey === crexTeam2Fkey) {
              battingTeam = team2;
              bowlingTeam = team1;
            } else if (batKey && crexTeam1Fkey && batKey === crexTeam1Fkey) {
              battingTeam = team1;
              bowlingTeam = team2;
            }
          }
          const isT2BatSv3 = battingTeam.toLowerCase() === team2.toLowerCase();
          const curFmtSv3 = `${sRuns}/${sWkts} (${sOw}.${sOb})`;
          if (isT2BatSv3) team2ScoreStr = curFmtSv3;
          else team1ScoreStr = curFmtSv3;

          if ((Number(sv3.inning) === 2 || sv3.secondHalf === true) && typeof sv3.score2 === "string" && sv3.score2.includes("-")) {
            const [r2Str, w2Str] = sv3.score2.split("-");
            const r2 = parseInt(r2Str, 10) || 0;
            const w2 = parseInt(w2Str, 10) || 0;
            const ov2Str = typeof sv3.over2 === "string" && sv3.over2.trim() ? ` (${sv3.over2.trim()})` : "";
            const fmt1st = `${r2}/${w2}${ov2Str}`;
            firstInningsScore = fmt1st;
            target = r2 + 1;
            if (isT2BatSv3) team1ScoreStr = fmt1st;
            else team2ScoreStr = fmt1st;
          }
        }
      }
      const addSv3ActiveBatter = (pIdRaw: any, nameFallback: any, rRaw: any, bRaw: any, f4Raw: any, s6Raw: any) => {
        const pId = String(pIdRaw || "").replace(/^p_/, "").trim();
        const bName = playerMap[pId] || String(nameFallback || pId).trim();
        if (!bName || /^[A-Z0-9]{1,4}$/i.test(bName)) return;
        const rVal = parseInt(String(rRaw ?? "0").replace(/\D/g, ""), 10) || 0;
        const bVal = parseInt(String(bRaw ?? "0").replace(/\D/g, ""), 10) || 0;
        const f4Val = parseInt(String(f4Raw ?? "0").replace(/\D/g, ""), 10) || 0;
        const s6Val = parseInt(String(s6Raw ?? "0").replace(/\D/g, ""), 10) || 0;
        batsmen.push({ name: bName, runs: rVal, balls: bVal, fours: f4Val, sixes: s6Val, isOut: false });
      };
      if (sv3.p1f || sv3.player_full_name1 || sv3.pname1) {
        addSv3ActiveBatter(sv3.p1f, sv3.player_full_name1 || sv3.pname1, sv3.run1, sv3.ball1, sv3.four1, sv3.six1);
      }
      if (sv3.p2f || sv3.player_full_name2 || sv3.pname2) {
        addSv3ActiveBatter(sv3.p2f, sv3.player_full_name2 || sv3.pname2, sv3.run2, sv3.ball2, sv3.four2, sv3.six2);
      }
      if ((sv3.bowler_full_name || sv3.bname) && typeof sv3.bwr === "string" && sv3.bwr.includes("-")) {
        const bwName = String(sv3.bowler_full_name || sv3.bname).trim();
        const [wStr, rStr] = sv3.bwr.split("-");
        const wVal = parseInt(wStr, 10) || 0;
        const rVal = parseInt(rStr, 10) || 0;
        const ovStr = String(sv3.bover || "0.0").replace(/[()]/g, "").trim();
        const econStr = String(sv3.beco || "0.00");
        bowler = bwName;
        liveBowlerStats = { name: bwName, wickets: wVal, runs: rVal, overs: ovStr, maidens: 0, economy: econStr };
      }
    }
  }

  // Fallback: Extract active batsmen from web body text ONLY if structured scorecard wasn't found
  if (team1BattingStats.length === 0 && team2BattingStats.length === 0) {
    const crexBatsmenRegex = /([A-Z][A-Za-z.'\s-]{2,26}?)\s+(\d{1,3})\s*\(\s*(\d{1,3})\s*\)\s*4s:\s*(\d{1,2})\s*6s:\s*(\d{1,2})/g;
    let bm: RegExpExecArray | null;
    while ((bm = crexBatsmenRegex.exec(bodyText)) !== null && batsmen.length < 6) {
      const bName = bm[1].replace(/^\+\s*/, "").trim();
      if (bName && !batsmen.some(x => x.name === bName)) {
        batsmen.push({
          name: bName,
          runs: parseInt(bm[2], 10) || 0,
          balls: parseInt(bm[3], 10) || 0,
          fours: parseInt(bm[4], 10) || 0,
          sixes: parseInt(bm[5], 10) || 0
        });
      }
    }
  }

  // Recent balls commentary
  $(".cb-mini-col, .ds-flex.ds-space-x-1 span, .ds-text-tight-s, [class*='recent'] span").each((_i, el) => {
    const txt = $(el).text().trim();
    if (/^([0-6]|W|Wd|Nb|•|\.)$/i.test(txt) && recentBalls.length < 8) {
      recentBalls.push(txt === "." ? "•" : txt);
    }
  });

  const bpoFinal = detectedFormat === "100" ? 5 : 6;
  let totalBalls = (overs * bpoFinal) + ballsInOver;
  if (
    wickets > 10 ||
    (totalBalls === 0 && (score > 0 || wickets > 0)) ||
    isBogusH2HScore(score, wickets, overs, ballsInOver) ||
    (isCrexWithoutInningsDom && foundScores.length === 0 && !hasCrexSc4Started)
  ) {
    // Strictly treat e.g. 172/42 0.0 or H2H records 6/4 20.0 as upcoming until 0/0 0.0
    isUpcoming = true;
    score = 0;
    wickets = 0;
    overs = 0;
    ballsInOver = 0;
    totalBalls = 0;
    firstInningsScore = undefined;
    team1ScoreStr = undefined;
    team2ScoreStr = undefined;
    target = 0;
  }

  const upcomingDetected =
    !isBreakStatus &&
    !hasLiveBreakOrPlayClue &&
    (isUpcoming || (foundScores.length === 0 && !hasCrexSc4Started && score === 0 && overs === 0 && totalBalls === 0));
  const isDemoCricketUrl = cleanUrl.toLowerCase().startsWith("demo://") || cleanUrl.toLowerCase().startsWith("test://");

  // Only simulate auto-progress for explicit demo:// or test:// URLs
  if (isDemoCricketUrl && !upcomingDetected && score === 0 && overs === 0 && totalBalls === 0) {
    const prevCached = cached?.result;
    const outcomes = [0, 1, 1, 2, 4, 6, 0, 1];
    const addRuns = outcomes[Math.floor(Math.random() * outcomes.length)];
    const prevBalls = typeof prevCached?.totalBalls === "number" && prevCached.totalBalls > 0 ? prevCached.totalBalls : 86;
    totalBalls = prevBalls >= 120 ? 6 : prevBalls + 1;
    score = prevBalls >= 120 ? 9 : (prevCached?.score || 136) + addRuns;
    wickets = prevCached?.wickets ?? 3;
    overs = Math.floor(totalBalls / 6);
    ballsInOver = totalBalls % 6;
    if (!target) target = prevCached?.target || 176;
    const ballSym = addRuns === 0 ? "•" : String(addRuns);
    recentBalls.push(...(prevCached?.recentBalls || ["1", "4", "•", "2", "1"]).slice(-5), ballSym);
    if (!statusText) {
      statusText = `${battingTeam} need ${Math.max(1, target - score)} runs in ${Math.max(1, 120 - totalBalls)} balls`;
    }
  }

  const finalResult = {
    success: true,
    sport: "cricket",
    team1: team1 || "Team 1",
    team2: team2 || "Team 2",
    battingTeam: battingTeam || team1 || "Team 1",
    bowlingTeam: bowlingTeam || team2 || "Team 2",
    score,
    wickets,
    overs,
    ballsInOver,
    totalBalls,
    target: target || undefined,
    format: detectedFormat,
    maxOvers: detectedMaxOvers,
    firstInningsScore,
    team1Score: team1ScoreStr,
    team2Score: team2ScoreStr,
    isFinished: isFinishedMatch,
    isUpcoming: upcomingDetected,
    matchStartTime: matchStartTime || undefined,
    matchStartTimeIso: matchStartTimeIso || undefined,
    statusText: statusText || (upcomingDetected ? `Upcoming • ${team1 || 'Team 1'} vs ${team2 || 'Team 2'}` : `${battingTeam || 'Team'} ${score}/${wickets} (${overs}.${ballsInOver} ov)`),
    recentBalls: upcomingDetected ? [] : recentBalls,
    lastBallSymbol: upcomingDetected ? undefined : (recentBalls.length > 0 ? recentBalls[recentBalls.length - 1] : undefined),
    batsmen,
    battingStats: activeBattingStats.length > 0 ? activeBattingStats : undefined,
    team1BattingStats: team1BattingStats.length > 0 ? team1BattingStats : undefined,
    team2BattingStats: team2BattingStats.length > 0 ? team2BattingStats : undefined,
    team1BowlingStats: team1BowlingStats.length > 0 ? team1BowlingStats : undefined,
    team2BowlingStats: team2BowlingStats.length > 0 ? team2BowlingStats : undefined,
    playerList1: playerList1.length > 0 ? playerList1 : undefined,
    playerList2: playerList2.length > 0 ? playerList2 : undefined,
    activeBatsman1Idx,
    activeBatsman2Idx,
    onStrikeIdx,
    bowler,
    liveBowlerStats,
    liveBallEvent: upcomingDetected ? undefined : liveBallEvent,
    lastUpdated: new Date().toLocaleTimeString()
  };

  liveUrlScrapeCache.set(cleanUrl, { time: Date.now(), result: finalResult });
  return finalResult;
}

// Direct Text Parser fallback if AI is rate-limited or offline
function parseBetSlipDirectText(extractedText?: string) {
  if (!extractedText || extractedText.trim().length < 20) return null;

  const lines = extractedText.split("\n").map(l => l.trim()).filter(Boolean);
  const events: any[] = [];
  let slipNumber = "";
  let dateTime = "";
  let stake = "100.00";
  let overallOdds = "1.00";
  let potentialWinnings = "0.00";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const slipNumMatch = line.match(/(?:Slip|Ticket|Coupon|ID|No\.?)\s*[:#]?\s*(\d{7,15})/i);
    if (slipNumMatch && !slipNumber) slipNumber = slipNumMatch[1];

    const matchMatch = line.match(/([A-Z0-9\s.\-()]+?)\s+(?:vs\.?|–|-)\s+([A-Z0-9\s.\-()]+)/i);
    if (matchMatch && matchMatch[1].length > 2 && matchMatch[2].length > 2) {
      events.push({
        id: `ev-${events.length + 1}-${Date.now()}`,
        eventNumber: (events.length + 1).toString(),
        dateTime: "18.09 10:00 PM",
        sport: "Football",
        league: "Full Match",
        team1: matchMatch[1].trim(),
        team2: matchMatch[2].trim(),
        match: `${matchMatch[1].trim()} - ${matchMatch[2].trim()}`,
        selection: "W1",
        odds: "1.50",
        status: "Pending",
      });
    }
  }

  if (events.length === 0) return null;
  return { 
    slipNumber: slipNumber || Math.floor(1000000000 + Math.random() * 9000000000).toString(), 
    dateTime: dateTime || new Date().toLocaleString(), 
    betType: events.length > 1 ? "Accumulator" : "Single", 
    overallOdds, 
    stake, 
    potentialWinnings, 
    events 
  };
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));

  // Probes for Cloud Run & health checks
  app.get(["/health", "/healthz", "/api/health"], (_req, res) => {
    res.status(200).json({ status: "ok", port: PORT });
  });

  // Main Slip OCR & Parsing endpoint
  app.post("/api/parse-slip", async (req, res) => {
    const { fileBase64, mimeType, extractedText } = req.body || {};
    const directCandidate = parseBetSlipDirectText(extractedText);

    try {
      const ai = getAiClient();
      if (!ai) {
        if (directCandidate) {
          return res.json({ success: true, data: directCandidate });
        }
        return res.status(500).json({ error: "Gemini API Key missing on server." });
      }

      const requestParts: any[] = [];
      if (fileBase64) {
        requestParts.push({
          inlineData: {
            mimeType: mimeType || "image/jpeg",
            data: fileBase64.replace(/^data:[^;]+;base64,/, ""),
          },
        });
      }

      if (extractedText) {
        requestParts.push({
          text: `Here is the extracted text from the bet slip document:\n"""\n${extractedText}\n"""`
        });
      }

      requestParts.push({
        text: `You are an expert Betting Slip OCR parser. Analyze this betting ticket/slip image or text with maximum precision.
Extract all bet slip details accurately into the following JSON schema:
{
  "slipNumber": string,
  "dateTime": string,
  "betType": string (e.g. "Accumulator", "Single", "System"),
  "overallOdds": string,
  "wonOdds": string,
  "stake": string,
  "potentialWinnings": string,
  "wonPayout": string,
  "status": "Win" | "Lost" | "Cancel" | "Pending" | "Live",
  "account": string (optional, account ID or username if visible),
  "events": [
    {
      "id": string (unique ID e.g. "ev-1"),
      "eventNumber": string (e.g. "1"),
      "dateTime": string,
      "sport": string (e.g. "Football", "Cricket", "Basketball", "Tennis"),
      "league": string (e.g. "UEFA Champions League", "Premier League"),
      "match": string (e.g. "Arsenal - Chelsea"),
      "team1": string,
      "team2": string,
      "selection": string (e.g. "W1", "Total Over 2.5", "Handicap (0)"),
      "odds": string,
      "status": "Win" | "Lost" | "Cancel" | "Pending" | "Live",
      "score1": string (optional),
      "score2": string (optional)
    }
  ]
}

Return ONLY valid JSON without markdown fences.`
      });

      let response: any = null;
      // gemini-3.1-flash-lite has ultra-high throughput and does not suffer from 503 demand spikes
      const candidateModels = [
        "gemini-3.1-flash-lite",
        "gemini-3.8-flash",
        "gemini-3.6-flash",
        "gemini-flash-latest",
      ];
      let lastGenError: any = null;

      for (const modelName of candidateModels) {
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            response = await ai.models.generateContent({
              model: modelName,
              contents: [{ parts: requestParts }],
              config: {
                responseMimeType: "application/json",
              },
            });
            if (response && response.text) {
              break;
            }
          } catch (modelErr: any) {
            lastGenError = modelErr;
            const errMsg = modelErr?.message || "";
            // If experiencing temporary 503 demand spike, wait briefly before retrying or switching
            if (errMsg.includes("503") || errMsg.includes("UNAVAILABLE") || errMsg.includes("high demand")) {
              await new Promise((resolve) => setTimeout(resolve, 600));
            } else {
              break; // Switch directly to next model
            }
          }
        }
        if (response && response.text) {
          break;
        }
      }

      if (!response || !response.text) {
        throw lastGenError || new Error("All Gemini models temporarily unavailable");
      }

      let rawText = response.text || "{}";
      rawText = rawText.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
      const parsed = JSON.parse(rawText);

      // Ensure a globally unique id and default fields for each event so events across different slips never collide on "ev-1", "ev-2"
      const parseTs = Date.now();
      if (parsed.events && Array.isArray(parsed.events)) {
        parsed.events = parsed.events.map((ev: any, idx: number) => ({
          id: `ev-${parseTs}-${idx + 1}-${Math.random().toString(36).slice(2, 6)}`,
          eventNumber: ev.eventNumber || (idx + 1).toString(),
          dateTime: ev.dateTime || new Date().toLocaleString(),
          sport: ev.sport || "Football",
          league: ev.league || "Full Match",
          match: ev.match || `${ev.team1 || 'Team 1'} - ${ev.team2 || 'Team 2'}`,
          team1: ev.team1 || "",
          team2: ev.team2 || "",
          selection: ev.selection || "W1",
          odds: ev.odds || "1.00",
          status: ev.status || "Pending",
          score1: ev.score1 || "",
          score2: ev.score2 || "",
        }));
      }

      return res.json({ success: true, data: parsed });
    } catch (err: any) {
      if (directCandidate) {
        return res.json({ success: true, data: directCandidate, isFallback: true });
      }
      
      // Graceful fallback ticket if AI models are temporarily down
      const fallbackTicket = {
        slipNumber: Math.floor(1000000000 + Math.random() * 9000000000).toString(),
        dateTime: new Date().toLocaleString(),
        betType: "Single",
        overallOdds: "1.85",
        wonOdds: "1.85",
        stake: "100.00",
        potentialWinnings: "185.00",
        wonPayout: "0.00",
        status: "Pending",
        account: "",
        events: [
          {
            id: `ev-1-${Date.now()}`,
            eventNumber: "1",
            dateTime: new Date().toLocaleString(),
            sport: "Football",
            league: "Full Match",
            match: "Team 1 vs Team 2",
            team1: "Team 1",
            team2: "Team 2",
            selection: "W1",
            odds: "1.85",
            status: "Pending",
            score1: "",
            score2: "",
          }
        ]
      };
      return res.json({ success: true, data: fallbackTicket, isFallback: true });
    }
  });

  // Real-time Server-Sent Events (SSE) stream + Continuous Server Background Hot-Poller for nanosecond score sync
  app.get("/api/live-match-stream", (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders?.();

    res.write(`data: ${JSON.stringify({ connected: true, ts: Date.now() })}\n\n`);
    liveSseClients.add(res);

    req.on("close", () => {
      liveSseClients.delete(res);
    });
  });

  // Background hot-poller: continuously polls active watched HTTP(S) match URLs over Keep-Alive sockets
  // so any score change on the source link is detected & pushed via SSE without client polling storms
  setInterval(() => {
    if (liveSseClients.size === 0) return;
    const now = Date.now();
    for (const [key, entry] of activeHotPolledUrls.entries()) {
      if (now - entry.lastRequestedAt > 60000) {
        activeHotPolledUrls.delete(key);
        continue;
      }
      if (entry.isFetching) continue;
      entry.isFetching = true;
      parseLiveCricketUrl(entry.url, entry.team1, entry.team2, entry.sport, true)
        .catch(() => {})
        .finally(() => {
          entry.isFetching = false;
        });
    }
  }, 3000);

  // Live Cricket & Football Match Link Extractor & Poller
  app.post("/api/cricket/fetch-live-url", async (req, res) => {
    try {
      const { url, team1, team2, sport } = req.body || {};
      if (!url || typeof url !== "string") {
        return res.status(400).json({ error: "Match URL is required" });
      }
      const data = await parseLiveCricketUrl(url, team1, team2, sport);
      return res.json({ success: true, data });
    } catch (err: any) {
      console.error("Live match fetch error:", err?.message);
      return res.status(500).json({ error: err?.message || "Failed to parse live cricket score" });
    }
  });

  // Batch Live Match Poller (syncs all active/upcoming/linked matches in a single HTTP request to prevent HTTP 429 rate-limiting)
  app.post("/api/cricket/fetch-live-batch", async (req, res) => {
    try {
      const items = Array.isArray(req.body?.items) ? req.body.items.slice(0, 20) : [];
      const results: Record<string, any> = {};
      await Promise.allSettled(
        items.map(async (item: any) => {
          const url = String(item?.url || "").trim();
          const key = String(item?.id || url).trim();
          if (!url || !key) return;
          try {
            const data = await parseLiveCricketUrl(url, item?.team1, item?.team2, item?.sport);
            if (data) {
              results[key] = data;
            }
          } catch {}
        })
      );
      return res.json({ success: true, results });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || "Batch sync failed" });
    }
  });

  // Search & Generate Match Link by Team vs Team, Date & Time (Crex for Cricket, Sofascore for Football)
  app.post("/api/search-match-link", async (req, res) => {
    try {
      const { team1 = "", team2 = "", match = "", sport = "", dateTime = "", league = "", selection = "" } = req.body || {};
      const ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";

      let t1 = String(team1 || "").trim();
      let t2 = String(team2 || "").trim();
      if ((!t1 || !t2) && match) {
        const parts = String(match).split(/\s+(?:vs\.?|v\/s|v|-|–|—)\s+/i);
        if (parts.length >= 2) {
          t1 = t1 || parts[0].trim();
          t2 = t2 || parts.slice(1).join(" ").trim();
        }
      }

      // Refresh Crex live & upcoming fixtures list (cached 45s)
      const now = Date.now();
      if (!crexLiveFixturesCache.items.length || now - crexLiveFixturesCache.time > 45000) {
        try {
          const [rHome, rFix] = await Promise.allSettled([
            axios.get("https://crex.com", { headers: { "User-Agent": ua }, timeout: 3500 }),
            axios.get("https://crex.com/fixtures/match-list", { headers: { "User-Agent": ua }, timeout: 3500 })
          ]);
          const seenUrls = new Set<string>();
          const items: Array<{ url: string; slug: string; text: string }> = [];
          for (const r of [rHome, rFix]) {
            if (r.status === "fulfilled" && r.value?.data) {
              const $ = cheerio.load(String(r.value.data));
              $('a[href*="/cricket-live-score/"], a[href*="/scoreboard/"]').each((_, el) => {
                const href = String($(el).attr("href") || "").trim();
                if (!href) return;
                const fullUrl = href.startsWith("http") ? href : `https://crex.com${href.startsWith("/") ? "" : "/"}${href}`;
                if (seenUrls.has(fullUrl)) return;
                seenUrls.add(fullUrl);
                const slug = (fullUrl.split("/").pop() || "").toLowerCase();
                const text = $(el).text().replace(/\s+/g, " ").trim();
                items.push({ url: fullUrl, slug, text });
              });
            }
          }
          if (items.length > 0) {
            crexLiveFixturesCache = { time: now, items };
          }
        } catch {}
      }

      const normSlug = (s: string) =>
        String(s || "")
          .replace(/[ıİ]/g, "i")
          .replace(/[ğĞ]/g, "g")
          .replace(/[üÜ]/g, "u")
          .replace(/[şŞ]/g, "s")
          .replace(/[öÖ]/g, "o")
          .replace(/[çÇ]/g, "c")
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "");

      const makeTeamCricketCodes = (rawName: string): string[] => {
        const clean = normSlug(rawName);
        if (!clean) return [];
        const words = clean.split("-").filter(Boolean);
        const codes = new Set<string>([clean, clean.replace(/-/g, "")]);
        const knownMap: Record<string, string[]> = {
          "pakistan": ["pak", "pakch", "pak-w", "paku19"],
          "sri-lanka": ["sl", "slch", "sl-w", "slu19"],
          "india": ["ind", "indch", "ind-a", "ind-w", "indu19"],
          "bangladesh": ["ban", "banch", "ban-w", "banwu19", "banu19"],
          "australia": ["aus", "ausch", "aus-a", "aus-w"],
          "england": ["eng", "engch", "eng-w"],
          "west-indies": ["wi", "wich", "wi-w"],
          "south-africa": ["sa", "sach", "sa-e", "sa-w"],
          "new-zealand": ["nz", "nzch", "nz-w"],
          "zimbabwe": ["zim", "zim-w"],
          "afghanistan": ["afg", "afg-a"],
          "ireland": ["ire", "ire-w"],
          "netherlands": ["ned"],
          "scotland": ["sco"],
          "united-states": ["usa"],
          "namibia": ["nam"],
          "nepal": ["nep"],
          "oman": ["oma"],
          "united-arab-emirates": ["uae"],
          "hong-kong": ["hk"],
          "malaysia": ["mas"],
          "kuwait": ["kuw"],
          "thailand": ["thai"]
        };
        for (const [k, list] of Object.entries(knownMap)) {
          if (clean === k || clean.startsWith(k + "-")) {
            list.forEach(c => codes.add(c));
          }
        }
        if (words.length === 1 && words[0].length >= 3) {
          codes.add(words[0].slice(0, 3));
        } else if (words.length >= 2) {
          codes.add(words.map(w => w[0]).join(""));
          if (words[1] === "champions") {
            codes.add(words[0].slice(0, 3) + "ch");
          }
          if (words[1] === "women" || words[1] === "w") {
            codes.add(words[0].slice(0, 3) + "-w");
          }
        }
        return [...codes];
      };

      const matchCrexItem = (tA: string, tB: string) => {
        const codesA = makeTeamCricketCodes(tA);
        const codesB = makeTeamCricketCodes(tB);
        if (!codesA.length || !codesB.length) return null;

        for (const item of crexLiveFixturesCache.items) {
          const vsParts = item.slug.split("-vs-");
          const leftCode = vsParts[0] || "";
          const rightSide = vsParts[1] || "";
          const rightCode = (rightSide.split(/-(?:\d+(?:st|nd|rd|th)|only|final|semi|match|t20|odi|test)/i)[0] || "").trim();
          const fullTextSlug = `${item.slug} ${normSlug(item.text)}`;

          const matchesTeam = (codes: string[], sideCode: string) =>
            codes.some(c =>
              c === sideCode ||
              (c.length >= 4 && fullTextSlug.includes(c))
            );

          const direct =
            (matchesTeam(codesA, leftCode) && matchesTeam(codesB, rightCode)) ||
            (matchesTeam(codesA, rightCode) && matchesTeam(codesB, leftCode));

          if (direct) return item.url;
        }
        return null;
      };

      const matchedCrexUrl = matchCrexItem(t1, t2);

      // Determine sport: Cricket vs Football
      const combinedContext = `${sport} ${league} ${selection} ${t1} ${t2} ${match}`.toLowerCase();
      const hasFootballClubKeyword = /\b(?:spor|belediyespor|fc|cf|sc|fk|sk|fsk|united|city|real\s+madrid|barcelona|arsenal|chelsea|liverpool|bayern|juventus|milan|inter|psg|karagumruk|istanbulspor|somaspor|alanya|kars|fatsa|galatasaray|fenerbahce|besiktas)\b/i.test(combinedContext);
      const hasCricketKeyword = /\b(?:cricket|crex|t20|odi|test|ipl|bpl|psl|bbl|cpl|wcl|wicket|over|runs?|innings|champions|legends)\b/i.test(combinedContext);
      const isKnownCricketNation = (s: string) =>
        /^(?:pakistan|sri\s*lanka|india|bangladesh|australia|england|west\s*indies|south\s*africa|new\s*zealand|zimbabwe|afghanistan|ireland|scotland|netherlands|nepal|oman|uae|namibia|usa|hong\s*kong|malaysia|kuwait)(?:\s+(?:women|w|a|u19|champions|legends))?$/i.test(s.trim());

      const isCricket =
        String(sport).toLowerCase() === "cricket" ||
        Boolean(matchedCrexUrl && !hasFootballClubKeyword) ||
        (!hasFootballClubKeyword && (hasCricketKeyword || (isKnownCricketNation(t1) && isKnownCricketNation(t2))));

      const resolvedSport: "cricket" | "football" = isCricket ? "cricket" : "football";

      // Deterministic hash for realistic ved/usg/customId parameters
      const hashStr = `${t1}|${t2}|${dateTime}|${resolvedSport}`;
      let hVal = 2166136261;
      for (let i = 0; i < hashStr.length; i++) {
        hVal ^= hashStr.charCodeAt(i);
        hVal = Math.imul(hVal, 16777619);
      }
      const absH = Math.abs(hVal);
      const base52Chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
      let sfCode = "";
      let tempH = absH || 1234567;
      for (let i = 0; i < 7; i++) {
        sfCode += base52Chars[tempH % base52Chars.length];
        tempH = Math.floor(tempH / 7) + (i + 3) * 19;
      }

      let directUrl = "";
      const webResults: Array<{
        title: string;
        snippet: string;
        boldTerm?: string;
        siteName: string;
        siteDisplayUrl: string;
        directUrl: string;
        url: string;
        domain: string;
        isOfficialSource: boolean;
      }> = [];

      const ved = resolvedSport === "cricket"
        ? "2ahUKEwiApqa856eXAxUK3jgGHWlrAdgQFnoECB4QAQ"
        : "2ahUKEwjDnLbL56eXAxVs8DgGHT67M0oQFnoECCcQAQ";
      const usg = resolvedSport === "cricket"
        ? "AOvVaw3-Bmau2CJQGUafahJP01TV"
        : "AOvVaw1ts_gB_G8RBAuTu9WuiwuF";

      const wrapGoogleUrl = (u: string) =>
        `https://www.google.com/url?sa=t&source=web&rct=j&opi=89978449&url=${u}&ved=${ved}&usg=${usg}`;

      // Perform real web search for the two teams to get real Crex / Sofascore / Google results
      const customQuery = String(req.body?.query || "").trim();
      const siteHint = resolvedSport === "cricket" ? "crex" : "sofascore";
      const defaultTeamQuery = t1 && t2 ? `${t1} vs ${t2} ${siteHint}` : (match ? `${match} ${siteHint}` : `live score ${siteHint}`);
      const baseQuery = customQuery || defaultTeamQuery;

      const getSiteMeta = (urlStr: string, dom: string) => {
        const d = dom.toLowerCase();
        if (d.includes("sofascore")) {
          return { siteName: "Sofascore", siteDisplayUrl: "https://www.sofascore.com" };
        }
        if (d.includes("crex")) {
          return { siteName: "CREX", siteDisplayUrl: "https://crex.com" };
        }
        if (d.includes("espncricinfo")) {
          return { siteName: "ESPNcricinfo", siteDisplayUrl: "https://www.espncricinfo.com" };
        }
        if (d.includes("cricbuzz")) {
          return { siteName: "Cricbuzz", siteDisplayUrl: "https://www.cricbuzz.com" };
        }
        if (d.includes("flashscore")) {
          return { siteName: "Flashscore", siteDisplayUrl: "https://www.flashscore.com" };
        }
        try {
          const u = new URL(urlStr);
          const cleanHost = u.hostname.replace(/^www\./i, "");
          const capName = cleanHost.split(".")[0].charAt(0).toUpperCase() + cleanHost.split(".")[0].slice(1);
          return { siteName: capName, siteDisplayUrl: `${u.protocol}//${u.hostname}` };
        } catch {
          return { siteName: dom || "Web", siteDisplayUrl: `https://${dom || "google.com"}` };
        }
      };

      let preloadedFootballLive: any = null;
      if (resolvedSport === "cricket") {
        try {
          const searchWithHint = /\b(?:crex|sofascore)\b/i.test(baseQuery) ? baseQuery : `${baseQuery} ${siteHint}`;
          const [ddgSite, ddgGeneral] = await Promise.allSettled([
            axios.get(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(searchWithHint)}`, {
              headers: { "User-Agent": ua },
              timeout: 2400
            }),
            axios.get(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(`${t1 && t2 ? `${t1} vs ${t2}` : baseQuery} live score`)}`, {
              headers: { "User-Agent": ua },
              timeout: 2400
            })
          ]);

          const seenDirect = new Set<string>();
          const parseDdgHtml = (htmlStr: string) => {
            const $ = cheerio.load(htmlStr);
            $(".result").each((_, el) => {
              const aEl = $(el).find("a.result__a").first();
              const rawHref = String(aEl.attr("href") || "").trim();
              const title = aEl.text().replace(/\s+/g, " ").trim();
              const snippet = $(el).find(".result__snippet").first().text().replace(/\s+/g, " ").trim();
              if (!rawHref || !title) return;

              let realUrl = rawHref;
              try {
                if (rawHref.includes("uddg=")) {
                  const uMatch = rawHref.match(/[?&]uddg=([^&]+)/);
                  if (uMatch && uMatch[1]) {
                    realUrl = decodeURIComponent(uMatch[1]);
                  }
                } else if (rawHref.startsWith("//")) {
                  realUrl = "https:" + rawHref;
                }
              } catch {}

              if (!/^https?:\/\//i.test(realUrl) || seenDirect.has(realUrl)) return;
              seenDirect.add(realUrl);

              let domain = "";
              try {
                domain = new URL(realUrl).hostname.replace(/^www\./i, "");
              } catch {}

              const isOfficial =
                domain.includes("crex.com") ||
                domain.includes("sofascore.com") ||
                domain.includes("espncricinfo.com") ||
                domain.includes("cricbuzz.com");

              const meta = getSiteMeta(realUrl, domain);

              webResults.push({
                title,
                snippet: snippet || `${title} — Live Score, Match Updates & Statistics`,
                boldTerm: t1 && t2 ? `${t1} vs ${t2}` : undefined,
                siteName: meta.siteName,
                siteDisplayUrl: meta.siteDisplayUrl,
                directUrl: realUrl,
                url: wrapGoogleUrl(realUrl),
                domain: domain || "google.com",
                isOfficialSource: isOfficial
              });
            });
          };

          if (ddgSite.status === "fulfilled" && ddgSite.value?.data) {
            parseDdgHtml(String(ddgSite.value.data));
          }
          if (ddgGeneral.status === "fulfilled" && ddgGeneral.value?.data) {
            parseDdgHtml(String(ddgGeneral.value.data));
          }
        } catch {}
      }

      const c1Upper = (makeTeamCricketCodes(t1)[0] || normSlug(t1).slice(0, 3) || "T1").toUpperCase();
      const c2Upper = (makeTeamCricketCodes(t2)[0] || normSlug(t2).slice(0, 3) || "T2").toUpperCase();
      const yearMatch = String(dateTime).match(/\b(202\d)\b/);
      const year = yearMatch ? yearMatch[1] : new Date().getFullYear().toString();

      if (resolvedSport === "cricket") {
        const webCrexMatch = webResults.find(
          r => r.directUrl.includes("crex.com/scoreboard/") || r.directUrl.includes("crex.com/cricket-live-score/")
        );
        if (matchedCrexUrl) {
          directUrl = matchedCrexUrl;
        } else if (webCrexMatch) {
          directUrl = webCrexMatch.directUrl;
        } else {
          const c1 = makeTeamCricketCodes(t1)[0] || normSlug(t1).slice(0, 3) || "t1";
          const c2 = makeTeamCricketCodes(t2)[0] || normSlug(t2).slice(0, 3) || "t2";
          const s1 = normSlug(t1) || "team-1";
          const s2 = normSlug(t2) || "team-2";
          const code4 = (absH % 46656).toString(36).toUpperCase().padStart(4, "1");
          directUrl = `https://crex.com/cricket-live-score/${c1}-vs-${c2}-1st-match-${s2}-tour-of-${s1}-${year}-match-updates-${code4}`;
        }
      } else {
        const webSofaMatch = webResults.find(
          r => r.directUrl.includes("sofascore.com/") && /\/match\/|\/event\//i.test(r.directUrl)
        );
        if (webSofaMatch) {
          directUrl = webSofaMatch.directUrl;
        } else {
          directUrl = buildSofascoreMatchUrl(t1 || "Team 1", t2 || "Team 2", absH);
        }

        // Register generated Sofascore URL in generatedFootballUrlTeamsMap so any subsequent preview or link paste resolves exact teams
        if (t1 && t2) {
          const cleanNoHash = directUrl.split("#")[0].split("?")[0].trim().toLowerCase();
          generatedFootballUrlTeamsMap.set(cleanNoHash, { team1: t1, team2: t2, dateTime, league });
          const segs = cleanNoHash.split("/").filter(Boolean);
          const slugCandidate = segs.find((s) => s.includes("-") && !s.includes("sofascore"));
          if (slugCandidate) {
            generatedFootballUrlTeamsMap.set(slugCandidate, { team1: t1, team2: t2, dateTime, league });
          }
          // Also register simple s1-s2 slug in case user pastes an old generated link
          const simpleS1 = normSlug(t1);
          const simpleS2 = normSlug(t2);
          if (simpleS1 && simpleS2) {
            generatedFootballUrlTeamsMap.set(`${simpleS1}-${simpleS2}`, { team1: t1, team2: t2, dateTime, league });
            generatedFootballUrlTeamsMap.set(`${simpleS2}-${simpleS1}`, { team1: t1, team2: t2, dateTime, league });
          }
        }

        // Pre-warm live match data for this Sofascore URL from 365Scores / ESPN so Link Preview & Paste Sync work in 0ms!
        try {
          const [espnRes, s365Res] = await Promise.all([
            tryFetchEspnSoccerMatch(directUrl, t1, t2, true),
            tryFetch365ScoresSoccerMatch(directUrl, t1, t2)
          ]);
          preloadedFootballLive = espnRes || s365Res;
          if (preloadedFootballLive) {
            liveUrlScrapeCache.set(directUrl, { time: Date.now(), result: preloadedFootballLive });
          }
        } catch {}
      }

      const googleWrappedUrl = wrapGoogleUrl(directUrl);

      // Ensure the primary Crex / Sofascore result is always at the top of webResults in authentic Google Dark Mode format
      const existingTopIdx = webResults.findIndex(r => r.directUrl === directUrl);
      if (existingTopIdx > 0) {
        const [found] = webResults.splice(existingTopIdx, 1);
        webResults.unshift(found);
      } else if (existingTopIdx === -1) {
        if (resolvedSport === "cricket") {
          webResults.unshift({
            title: `${c1Upper} vs ${c2Upper} ${year} Recent Matches and Schedules`,
            snippet: `Get all ${c1Upper} vs ${c2Upper} ${year} matches list or fixtures with detailed schedule, live score and ball-by-ball match information on CREX.`,
            boldTerm: `Get all ${c1Upper} vs ${c2Upper} ${year} matches list or fixtures`,
            siteName: "CREX",
            siteDisplayUrl: "https://crex.com",
            directUrl,
            url: googleWrappedUrl,
            domain: "crex.com",
            isOfficialSource: true
          });
          // Also add the live scoreboard entry right below
          const liveScoreTitle = `${t1 || c1Upper} vs ${t2 || c2Upper} Live Cricket Score, Scorecard & Ball by Ball Updates`;
          webResults.splice(1, 0, {
            title: liveScoreTitle,
            snippet: `${t1 || c1Upper} vs ${t2 || c2Upper} live cricket score, playing XI, toss, batting and bowling stats (${dateTime || "Live Match"}) on CREX.`,
            boldTerm: `${t1 || c1Upper} vs ${t2 || c2Upper} live cricket score`,
            siteName: "CREX",
            siteDisplayUrl: "https://crex.com",
            directUrl,
            url: googleWrappedUrl,
            domain: "crex.com",
            isOfficialSource: true
          });
        } else {
          const liveSummarySnippet = preloadedFootballLive
            ? `${t1 || "Team 1"} vs ${t2 || "Team 2"} live score (${preloadedFootballLive.footballScore1 ?? 0} - ${preloadedFootballLive.footballScore2 ?? 0}, ${preloadedFootballLive.footballMinute || "Live"}), H2H results, standings and lineups on Sofascore. ${preloadedFootballLive.statusText || ""}`
            : `${t1 || "Team 1"} vs ${t2 || "Team 2"} live score, H2H results, standings and lineups. Currently follow ${t1 || "Team 1"} vs ${t2 || "Team 2"} live match updates and goals on Sofascore...`;
          webResults.unshift({
            title: `${t1 || "Team 1"} vs ${t2 || "Team 2"} live score, H2H and lineups`,
            snippet: liveSummarySnippet,
            boldTerm: `${t1 || "Team 1"} vs ${t2 || "Team 2"} live score`,
            siteName: "Sofascore",
            siteDisplayUrl: "https://www.sofascore.com",
            directUrl,
            url: googleWrappedUrl,
            domain: "sofascore.com",
            isOfficialSource: true
          });
          const h2hTitle = `${t1 || "Team 1"} vs ${t2 || "Team 2"} Live Football Score, Goals, Stats & Match Center | Sofascore`;
          webResults.splice(1, 0, {
            title: h2hTitle,
            snippet: `Follow ${t1 || "Team 1"} vs ${t2 || "Team 2"} (${league || "Football"}) real-time score, goal scorers, yellow/red cards, possession and H2H statistics on Sofascore.`,
            boldTerm: `${t1 || "Team 1"} vs ${t2 || "Team 2"}`,
            siteName: "Sofascore",
            siteDisplayUrl: "https://www.sofascore.com",
            directUrl,
            url: googleWrappedUrl,
            domain: "sofascore.com",
            isOfficialSource: true
          });
        }
      }

      return res.json({
        success: true,
        query: baseQuery,
        team1: t1,
        team2: t2,
        sport: resolvedSport,
        source: resolvedSport === "cricket" ? "crex.com" : "sofascore.com",
        directUrl,
        url: googleWrappedUrl,
        results: webResults.slice(0, 12)
      });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || "Failed to generate match link" });
    }
  });

  app.get(["/api/live-match", "/api/cricket/fetch-live-url"], async (req, res) => {
    try {
      const url = (req.query.url as string) || "";
      const team1 = (req.query.team1 as string) || undefined;
      const team2 = (req.query.team2 as string) || undefined;
      const sport = (req.query.sport as string) || undefined;
      if (!url) {
        return res.status(400).json({ error: "url is required" });
      }
      const data = await parseLiveCricketUrl(url, team1, team2, sport);
      return res.json({ success: true, data });
    } catch (err: any) {
      console.error("Live match fetch error:", err?.message);
      return res.status(500).json({ error: err?.message || "Failed to parse live cricket score" });
    }
  });

  // Sofascore Web Preview Frame Endpoint (avoids X-Frame-Options: SAMEORIGIN block when previewing Sofascore links in-app)
  app.get("/api/sofascore-web-preview", async (req, res) => {
    try {
      const rawUrl = String(req.query.url || "").trim();
      const qTeam1 = String(req.query.team1 || "").trim();
      const qTeam2 = String(req.query.team2 || "").trim();
      const data = await parseLiveCricketUrl(rawUrl || "https://www.sofascore.com/football", qTeam1 || undefined, qTeam2 || undefined, "football");
      const t1 = data?.team1 || qTeam1 || "Home";
      const t2 = data?.team2 || qTeam2 || "Away";
      const s1 = data?.footballScore1 ?? 0;
      const s2 = data?.footballScore2 ?? 0;
      const min = data?.footballMinute || "Live";
      const statusText = data?.statusText || `${t1} vs ${t2}`;
      const venue = data?.footballVenue || "Official Stadium";
      const goals = Array.isArray(data?.footballGoals) ? data.footballGoals : [];
      const cards = Array.isArray(data?.footballCards) ? data.footballCards : [];
      const goalsHtml = goals.length
        ? goals
            .map(
              (g: any) =>
                `<div style="display:flex;justify-content:space-between;padding:6px 10px;background:#1e222d;border-radius:8px;margin-bottom:5px;font-size:12px;">
                  <span>⚽ <b>${g.player || "Goal"}</b> (${g.team === "team1" ? t1 : t2})</span>
                  <span style="color:#4ade80;font-weight:700;">${g.minute || ""}</span>
                </div>`
            )
            .join("")
        : `<div style="color:#9aa0a6;font-size:12px;text-align:center;padding:8px;">No goal events recorded</div>`;
      const cardsHtml = cards.length
        ? cards
            .map(
              (c: any) =>
                `<div style="display:flex;justify-content:space-between;padding:5px 10px;background:#1e222d;border-radius:8px;margin-bottom:4px;font-size:11px;">
                  <span>${c.type === "red" ? "🟥" : "🟨"} ${c.player || "Player"} (${c.team === "team1" ? t1 : t2})</span>
                  <span style="color:#fbbf24;font-weight:700;">${c.minute || ""}</span>
                </div>`
            )
            .join("")
        : "";

      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${t1} vs ${t2} - Sofascore Live Match Center</title>
  <style>
    body { margin:0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background:#12151e; color:#f1f5f9; }
    .topbar { background:#374df5; padding:10px 14px; display:flex; align-items:center; justify-content:space-between; font-weight:800; font-size:14px; }
    .card { margin:12px; background:#181c26; border:1px solid #2a3040; border-radius:14px; padding:16px; }
    .score-row { display:flex; align-items:center; justify-content:space-between; gap:10px; margin:12px 0; }
    .team { flex:1; font-size:15px; font-weight:800; }
    .score-box { background:#232938; padding:8px 16px; border-radius:12px; font-size:22px; font-weight:900; color:#38bdf8; letter-spacing:1px; }
    .badge { display:inline-block; padding:3px 9px; border-radius:99px; font-size:11px; font-weight:700; background:#059669; color:#fff; }
  </style>
</head>
<body>
  <div class="topbar">
    <span>⚽ Sofascore Match Center</span>
    <span class="badge">${min}</span>
  </div>
  <div class="card">
    <div style="font-size:11px;color:#94a3b8;margin-bottom:6px;">📍 ${venue}</div>
    <div class="score-row">
      <div class="team">${t1}</div>
      <div class="score-box">${s1} - ${s2}</div>
      <div class="team" style="text-align:right;">${t2}</div>
    </div>
    <div style="font-size:12px;color:#60a5fa;font-weight:600;text-align:center;margin-bottom:12px;">${statusText}</div>
    <div style="border-top:1px solid #2a3040;padding-top:10px;">
      <div style="font-size:11px;color:#94a3b8;font-weight:700;margin-bottom:6px;text-transform:uppercase;">Match Incidents & Goals</div>
      ${goalsHtml}
      ${cardsHtml}
    </div>
  </div>
</body>
</html>`);
    } catch (e: any) {
      return res.status(200).send(`<html><body style="background:#12151e;color:#fff;font-family:sans-serif;padding:16px;">Sofascore Preview Ready</body></html>`);
    }
  });

  // In-memory Sports News Store (Cricket & Football)
  let sportsNewsStore: SportsNewsArticle[] = [...INITIAL_SPORTS_NEWS];

  // Sports News API: Cricket & Football Latest News
  app.get("/api/sports-news", async (req, res) => {
    try {
      const category = (req.query.category as string || "all").toLowerCase();
      const q = (req.query.q as string || "").toLowerCase().trim();
      const breakingOnly = req.query.breaking === "true" || req.query.breaking === "1";

      let filtered = [...sportsNewsStore];

      if (category === "cricket" || category === "football") {
        filtered = filtered.filter(item => item.category === category);
      }

      if (breakingOnly) {
        filtered = filtered.filter(item => item.isBreaking);
      }

      if (q) {
        filtered = filtered.filter(item => 
          item.titleBn.toLowerCase().includes(q) ||
          item.titleEn.toLowerCase().includes(q) ||
          item.summaryBn.toLowerCase().includes(q) ||
          item.summaryEn.toLowerCase().includes(q) ||
          item.source.toLowerCase().includes(q) ||
          item.tags.some(t => t.toLowerCase().includes(q))
        );
      }

      return res.json({
        success: true,
        count: filtered.length,
        total: sportsNewsStore.length,
        cricketCount: sportsNewsStore.filter(n => n.category === "cricket").length,
        footballCount: sportsNewsStore.filter(n => n.category === "football").length,
        news: filtered,
        lastUpdated: new Date().toLocaleTimeString()
      });
    } catch (err: any) {
      console.error("Sports news API error:", err);
      return res.status(500).json({ error: "Failed to load sports news: " + err?.message });
    }
  });

  // Sports News Refresh API (Optional AI enrichment if Gemini key available)
  app.post("/api/sports-news/refresh", async (_req, res) => {
    try {
      // Re-timestamp with current relative times
      const refreshed = sportsNewsStore.map(item => ({
        ...item,
        timeBn: "এইমাত্র আপডেট",
        timeEn: "Just now",
        publishedAt: new Date().toISOString()
      }));
      sportsNewsStore = refreshed;

      // If Gemini AI client is available, attempt to generate breaking update
      try {
        const ai = getAiClient();
        if (ai) {
          const prompt = `Generate 2 ultra-fresh sports headlines (1 Cricket, 1 Football) for Bangladesh & Global sports fans in JSON format.
Return ONLY valid JSON array with 2 objects matching:
[
  {
    "id": "ai-cricket-${Date.now()}",
    "category": "cricket",
    "categoryLabelBn": "ক্রিকেট",
    "categoryLabelEn": "Cricket",
    "isBreaking": true,
    "titleBn": string,
    "titleEn": string,
    "summaryBn": string,
    "summaryEn": string,
    "contentBn": string,
    "contentEn": string,
    "source": "ESPN Cricinfo",
    "timeBn": "এইমাত্র",
    "timeEn": "Just now",
    "publishedAt": "${new Date().toISOString()}",
    "url": "https://www.espncricinfo.com",
    "tags": ["Cricket", "Breaking", "Live"],
    "imageUrl": "🏏"
  },
  {
    "id": "ai-football-${Date.now()}",
    "category": "football",
    "categoryLabelBn": "ফুটবল",
    "categoryLabelEn": "Football",
    "isBreaking": true,
    "titleBn": string,
    "titleEn": string,
    "summaryBn": string,
    "summaryEn": string,
    "contentBn": string,
    "contentEn": string,
    "source": "Goal.com",
    "timeBn": "এইমাত্র",
    "timeEn": "Just now",
    "publishedAt": "${new Date().toISOString()}",
    "url": "https://www.goal.com",
    "tags": ["Football", "Champions League", "Live"],
    "imageUrl": "⚽"
  }
]`;
          const aiRes = await ai.models.generateContent({
            model: "gemini-3.8-flash",
            contents: prompt,
            config: { responseMimeType: "application/json" }
          });
          if (aiRes && aiRes.text) {
            const parsed = JSON.parse(aiRes.text.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim());
            if (Array.isArray(parsed) && parsed.length > 0) {
              sportsNewsStore = [...parsed, ...sportsNewsStore.slice(0, 10)];
            }
          }
        }
      } catch (aiErr) {
        console.warn("AI news refresh skipped:", aiErr);
      }

      return res.json({
        success: true,
        count: sportsNewsStore.length,
        news: sportsNewsStore,
        message: "News refreshed successfully"
      });
    } catch (err: any) {
      return res.status(500).json({ error: "Failed to refresh sports news: " + err?.message });
    }
  });

  // Cloud Backup Save & Load (Protects against cache/storage wipe & maintains 1 daily backup file per day)
  app.post("/api/backup/save", async (req, res) => {
    try {
      const payload = req.body || {};
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, "0");
      const dd = String(now.getDate()).padStart(2, "0");
      const dateKey = `${yyyy}-${mm}-${dd}`;
      const dailyFileName = `cricket-score-master-daily-backup-${dateKey}.json`;
      const dailyFilePath = path.join(DATA_DIR, dailyFileName);

      const enrichedPayload = {
        ...payload,
        dailyBackupDate: dateKey,
        dailyBackupFileName: dailyFileName,
        lastUpdatedAt: now.toISOString(),
        timestamp: Date.now(),
      };

      const serialized = JSON.stringify(enrichedPayload);
      await fs.promises.writeFile(BACKUP_FILE, serialized, "utf-8");
      await fs.promises.writeFile(dailyFilePath, serialized, "utf-8");

      return res.json({
        success: true,
        timestamp: Date.now(),
        dateKey,
        fileName: dailyFileName,
      });
    } catch (err: any) {
      return res.status(500).json({ error: "Failed to save cloud backup: " + err?.message });
    }
  });

  app.get("/api/backup/load", async (req, res) => {
    try {
      const requestedFile = typeof req.query.file === "string" ? path.basename(req.query.file) : "";
      if (
        requestedFile &&
        (requestedFile.startsWith("cricket-score-master-daily-backup-") ||
          requestedFile.startsWith("cricket_score_daily_backup_")) &&
        requestedFile.endsWith(".json")
      ) {
        const targetPath = path.join(DATA_DIR, requestedFile);
        if (fs.existsSync(targetPath)) {
          const raw = await fs.promises.readFile(targetPath, "utf-8");
          return res.json({ success: true, data: JSON.parse(raw), fileName: requestedFile });
        }
      }
      if (fs.existsSync(BACKUP_FILE)) {
        const raw = await fs.promises.readFile(BACKUP_FILE, "utf-8");
        return res.json({ success: true, data: JSON.parse(raw) });
      }
      return res.json({ success: false, data: null, message: "No backup available" });
    } catch (err: any) {
      return res.status(500).json({ error: "Failed to read cloud backup: " + err?.message });
    }
  });

  app.get("/api/backup/daily-list", async (_req, res) => {
    try {
      const files = await fs.promises.readdir(DATA_DIR);
      const dailyFiles = [];
      for (const f of files) {
        if (
          (f.startsWith("cricket-score-master-daily-backup-") ||
            f.startsWith("cricket_score_daily_backup_")) &&
          f.endsWith(".json")
        ) {
          const fullPath = path.join(DATA_DIR, f);
          const stat = await fs.promises.stat(fullPath);
          dailyFiles.push({
            id: f,
            name: f,
            size: String(stat.size),
            createdTime: stat.birthtime.toISOString(),
            modifiedTime: stat.mtime.toISOString(),
          });
        }
      }
      dailyFiles.sort((a, b) => b.modifiedTime.localeCompare(a.modifiedTime));
      return res.json({ success: true, files: dailyFiles });
    } catch (err: any) {
      return res.status(500).json({ error: "Failed to list daily backups: " + err?.message });
    }
  });

  // Helper to gather live & upcoming Cricket and Football suggestions from ESPN + Crex/Sofascore presets
  async function getLiveAndUpcomingSuggestions() {
    const suggestions: any[] = [];
    const nextMatchIso = new Date(Date.now() + 3600000 * 3).toISOString();
    const nextMatchTimeStr = new Date(Date.now() + 3600000 * 3).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) + " (Today)";

    // Always include featured Bangladesh vs India upcoming/live options (Cricket & Football)
    suggestions.push(
      {
        id: "sug-ban-ind-cricket",
        sport: "cricket",
        team1: "Bangladesh",
        team2: "India",
        name: "Bangladesh vs India (Next Match)",
        isUpcoming: true,
        matchStartTime: `আজ সন্ধ্যা ৭:৩০ মি. (${nextMatchTimeStr})`,
        matchStartTimeIso: nextMatchIso,
        format: "20",
        score: 0,
        wickets: 0,
        overs: 0,
        liveMatchUrl: "https://crex.live/scoreboard/ban-vs-ind-upcoming",
        source: "crex.com",
        statusText: "Upcoming T20I • Starts at 7:30 PM"
      },
      {
        id: "sug-ban-ind-football",
        sport: "football",
        team1: "Bangladesh",
        team2: "India",
        name: "Bangladesh vs India (SAFF / AFC Qualifier)",
        isUpcoming: true,
        matchStartTime: `আজ রাত ৮:০০ মি. (${nextMatchTimeStr})`,
        matchStartTimeIso: new Date(Date.now() + 3600000 * 3.5).toISOString(),
        footballScore1: 0,
        footballScore2: 0,
        footballMinute: "Upcoming",
        footballPeriod: "Not started",
        footballVenue: "Bangabandhu National Stadium",
        liveMatchUrl: "https://www.sofascore.com/football/match/india-bangladesh/upcoming",
        source: "sofascore.com",
        statusText: "Upcoming Football • Starts at 8:00 PM"
      }
    );

    // Fetch live/today Cricket from ESPN scorepanel
    try {
      const cRes = await axios.get("https://site.api.espn.com/apis/site/v2/sports/cricket/scorepanel", { timeout: 3500 });
      for (const leagueGroup of (cRes.data?.scores || [])) {
        for (const ev of (leagueGroup.events || []).slice(0, 5)) {
          const comp = ev.competitions?.[0];
          const competitors = comp?.competitors || [];
          if (competitors.length < 2) continue;
          const c1 = competitors[0];
          const c2 = competitors[1];
          const t1 = c1?.team?.abbreviation || c1?.team?.displayName || "Team 1";
          const t2 = c2?.team?.abbreviation || c2?.team?.displayName || "Team 2";
          const state = String(ev.status?.type?.state || "in").toLowerCase();
          const isUpc = state === "pre";
          const c1ScoreRaw = String(c1?.score || "").trim();
          const c2ScoreRaw = String(c2?.score || "").trim();
          const c1Match = c1ScoreRaw.match(/(\d+)\/(\d+)/);
          const c2Match = c2ScoreRaw.match(/(\d+)\/(\d+)/);
          const isC2Active = Boolean(c2Match && (!c1Match || /\(\d+(?:\.\d+)?\s*ov/i.test(c2ScoreRaw)));
          const activeScoreStr = isC2Active ? c2ScoreRaw : (c1ScoreRaw || c2ScoreRaw);
          const sMatch = activeScoreStr.match(/(\d+)\/(\d+)/);
          const runs = sMatch ? parseInt(sMatch[1], 10) : 0;
          const wkts = sMatch ? parseInt(sMatch[2], 10) : 0;
          const ovMatch = activeScoreStr.match(/\((\d+(?:\.\d+)?)\s*ov/i);
          const ov = ovMatch ? parseFloat(ovMatch[1]) : 0;

          suggestions.push({
            id: `espn-cric-${ev.id || Math.random()}`,
            sport: "cricket",
            team1: t1,
            team2: t2,
            battingTeam: isC2Active ? t2 : t1,
            bowlingTeam: isC2Active ? t1 : t2,
            team1Score: c1Match ? `${c1Match[1]}/${c1Match[2]}` : undefined,
            team2Score: c2Match ? `${c2Match[1]}/${c2Match[2]}` : undefined,
            name: `${t1} vs ${t2}`,
            isUpcoming: isUpc,
            matchStartTime: isUpc && ev.date ? new Date(ev.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : undefined,
            matchStartTimeIso: isUpc && ev.date ? new Date(ev.date).toISOString() : undefined,
            format: "20",
            score: runs,
            wickets: wkts,
            overs: ov,
            liveMatchUrl: `https://crex.live/scoreboard/${t1.toLowerCase().replace(/\s+/g, "-")}-vs-${t2.toLowerCase().replace(/\s+/g, "-")}-live`,
            source: "crex.com",
            statusText: ev.status?.type?.detail || ev.status?.type?.description || `${c1?.score || ""} vs ${c2?.score || ""}`
          });
        }
      }
    } catch {}

    // Fetch live/today Football from ESPN soccer scoreboard
    try {
      const fRes = await axios.get("https://site.api.espn.com/apis/site/v2/sports/soccer/all/scoreboard", { timeout: 3500 });
      for (const ev of (fRes.data?.events || []).slice(0, 6)) {
        const comp = ev.competitions?.[0];
        const competitors = comp?.competitors || [];
        if (competitors.length < 2) continue;
        const home = competitors.find((c: any) => c.homeAway === "home") || competitors[0];
        const away = competitors.find((c: any) => c.homeAway === "away") || competitors[1];
        const t1 = home?.team?.displayName || "Home";
        const t2 = away?.team?.displayName || "Away";
        const s1 = parseInt(String(home?.score ?? "0"), 10) || 0;
        const s2 = parseInt(String(away?.score ?? "0"), 10) || 0;
        const state = String(comp?.status?.type?.state || "in").toLowerCase();
        const isUpc = state === "pre";
        const min = isUpc ? "Upcoming" : (state === "post" ? "FT" : (comp?.status?.displayClock || comp?.status?.type?.shortDetail || "Live"));
        const per = isUpc ? "Not started" : (state === "post" ? "FT" : (comp?.status?.period === 1 ? "1H" : "2H"));

        suggestions.push({
          id: `espn-fb-${ev.id || Math.random()}`,
          sport: "football",
          team1: t1,
          team2: t2,
          name: `${t1} vs ${t2}`,
          isUpcoming: isUpc,
          matchStartTime: isUpc && ev.date ? new Date(ev.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : undefined,
          matchStartTimeIso: isUpc && ev.date ? new Date(ev.date).toISOString() : undefined,
          footballScore1: s1,
          footballScore2: s2,
          footballMinute: min,
          footballPeriod: per,
          footballVenue: comp?.venue?.fullName || "Official Stadium",
          liveMatchUrl: `https://www.sofascore.com/football/match/${t1.toLowerCase().replace(/\s+/g, "-")}-${t2.toLowerCase().replace(/\s+/g, "-")}`,
          source: "sofascore.com",
          statusText: isUpc ? `Upcoming • ${new Date(ev.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : `${per} • ${min} (${t1} ${s1} - ${s2} ${t2})`
        });
      }
    } catch {}

    return suggestions.slice(0, 10);
  }

  app.get("/api/ai/suggestions", async (_req, res) => {
    try {
      const suggestions = await getLiveAndUpcomingSuggestions();
      return res.json({
        success: true,
        suggestions,
        headlines: sportsNewsStore.slice(0, 4)
      });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || "Failed to fetch suggestions" });
    }
  });

  // AI Assistant Endpoint with Function Calling + Google Search Grounding + Deterministic Fallback
  app.post("/api/ai/assistant", async (req, res) => {
    try {
      const { prompt, currentMatches = [], currentMatchId = "", lang = "bn" } = req.body || {};
      const userPrompt = String(prompt || "").trim();
      if (!userPrompt) {
        return res.status(400).json({ error: "Prompt is required" });
      }

      const suggestions = await getLiveAndUpcomingSuggestions();

      const addMatchDecl: FunctionDeclaration = {
        name: "add_match",
        description: "Add a new cricket or football match (live or upcoming/next match) from crex.com, sofascore.com, any URL, or by team names.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            sport: { type: Type.STRING, description: "'cricket' or 'football'" },
            team1: { type: Type.STRING, description: "First team name, e.g. 'Bangladesh', 'India', 'Real Madrid'" },
            team2: { type: Type.STRING, description: "Second team name, e.g. 'India', 'West Indies', 'Barcelona'" },
            name: { type: Type.STRING, description: "Match title, e.g. 'Bangladesh vs India'" },
            liveMatchUrl: { type: Type.STRING, description: "Live match URL from crex.com, sofascore.com, cricbuzz.com, etc." },
            isUpcoming: { type: Type.BOOLEAN, description: "True if this is an upcoming / next match that hasn't started yet" },
            matchStartTime: { type: Type.STRING, description: "Human-readable start time if upcoming, e.g. 'আজ সন্ধ্যা ৭:৩০ মি. (07:30 PM)'" },
            matchStartTimeIso: { type: Type.STRING, description: "ISO 8601 date-time string for countdown timer if upcoming" },
            format: { type: Type.STRING, description: "'20', '50', '10', or '100' for cricket" },
            score: { type: Type.NUMBER, description: "Current runs for cricket" },
            wickets: { type: Type.NUMBER, description: "Current wickets for cricket" },
            overs: { type: Type.NUMBER, description: "Current overs for cricket, e.g. 12.4" },
            target: { type: Type.NUMBER, description: "Target runs if 2nd innings" },
            firstInningsScore: { type: Type.STRING, description: "First innings score if 2nd innings" },
            footballScore1: { type: Type.NUMBER, description: "Home team goals if football" },
            footballScore2: { type: Type.NUMBER, description: "Away team goals if football" },
            footballMinute: { type: Type.STRING, description: "Match minute e.g. \"68'\" or 'Upcoming'" },
            footballPeriod: { type: Type.STRING, description: "'1H', 'HT', '2H', 'FT', or 'Not started'" },
            footballVenue: { type: Type.STRING, description: "Stadium name for football" }
          },
          required: ["sport", "team1", "team2"]
        }
      };

      const deleteMatchDecl: FunctionDeclaration = {
        name: "delete_match",
        description: "Delete a match from the app by matchId, team name, match name, 'current', or deleteAll.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            matchId: { type: Type.STRING, description: "Exact match ID if known" },
            teamOrMatchName: { type: Type.STRING, description: "Team name or match name to delete, or 'current'" },
            deleteAll: { type: Type.BOOLEAN, description: "True if user wants to delete all matches" }
          }
        }
      };

      const addMilestoneDecl: FunctionDeclaration = {
        name: "add_milestone",
        description: "Create/add a new target milestone (runs in overs) to the current or specified match.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            over: { type: Type.NUMBER, description: "Target over number, e.g. 6, 10, 15, 20" },
            runs: { type: Type.NUMBER, description: "Target runs at that over, e.g. 50, 85, 150" },
            condition: { type: Type.STRING, description: "'more' or 'lessOrEqual'" },
            odd: { type: Type.NUMBER, description: "Optional odd value, e.g. 1.85" },
            stake: { type: Type.NUMBER, description: "Optional stake amount, e.g. 100" }
          },
          required: ["over", "runs"]
        }
      };

      const deleteMilestoneDecl: FunctionDeclaration = {
        name: "delete_milestone",
        description: "Delete a target milestone by over, runs, or deleteAll.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            over: { type: Type.NUMBER, description: "Over number of the milestone to delete" },
            runs: { type: Type.NUMBER, description: "Runs of the milestone to delete" },
            deleteAll: { type: Type.BOOLEAN, description: "True to delete all milestones" },
            deleteLast: { type: Type.BOOLEAN, description: "True to delete the most recently added / last milestone" }
          }
        }
      };

      const updateMatchDecl: FunctionDeclaration = {
        name: "update_match",
        description: "Update score, wickets, overs, target, teams, or football score/minute/period of the active match.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            team1: { type: Type.STRING },
            team2: { type: Type.STRING },
            battingTeam: { type: Type.STRING },
            score: { type: Type.NUMBER },
            wickets: { type: Type.NUMBER },
            overs: { type: Type.NUMBER },
            target: { type: Type.NUMBER },
            firstInningsScore: { type: Type.STRING },
            isUpcoming: { type: Type.BOOLEAN },
            footballScore1: { type: Type.NUMBER },
            footballScore2: { type: Type.NUMBER },
            footballMinute: { type: Type.STRING },
            footballPeriod: { type: Type.STRING }
          }
        }
      };

      const switchViewDecl: FunctionDeclaration = {
        name: "switch_view_or_match",
        description: "Switch between 3-match lineup view ('lineup') and single match view ('single'), switch main tab ('scorer', 'betslip', 'runrate'), or reset current match.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            viewMode: { type: Type.STRING, description: "'lineup' or 'single'" },
            mainTab: { type: Type.STRING, description: "'scorer', 'betslip', or 'runrate'" },
            resetCurrentMatch: { type: Type.BOOLEAN, description: "True to reset current match score" }
          }
        }
      };

      const suggestLatestDecl: FunctionDeclaration = {
        name: "suggest_latest_matches",
        description: "Suggest latest live and upcoming cricket and football matches and sports updates.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            sportFilter: { type: Type.STRING, description: "'all', 'cricket', or 'football'" }
          }
        }
      };

      const actions: any[] = [];
      let replyText = "";
      let groundingLinks: Array<{ title: string; uri: string }> = [];

      const ai = getAiClient();
      if (ai) {
        const systemInstruction = `You are the smart AI Match Assistant inside "Remix Cricket Score Master".
You understand both Bengali (বাংলা) and English fluently. Respond in the language the user used (default to Bengali if they wrote in Bengali).
Current time: ${new Date().toISOString()}.
Current matches in the user's app: ${JSON.stringify(
          (currentMatches || []).map((m: any) => ({
            id: m.id,
            name: m.name,
            sport: m.sport || "cricket",
            team1: m.team1,
            team2: m.team2,
            score: m.sport === "football" ? `${m.footballScore1 ?? 0}-${m.footballScore2 ?? 0}` : `${m.score}/${m.wickets}`,
            isUpcoming: m.isUpcoming,
            milestones: (m.targetMilestones || []).map((tm: any) => ({ over: tm.over, runs: tm.runs, condition: tm.condition }))
          }))
        )}.
Active match ID: ${currentMatchId}.
Available live & upcoming match feed: ${JSON.stringify(suggestions.slice(0, 6))}.

Rules:
1. If the user asks to add a match (e.g. "crex.com থেকে বাংলাদেশ বনাম ভারতের পরবর্তী ম্যাচটি যুক্ত কর" or any cricket/football match or URL), ALWAYS call the \`add_match\` tool!
   - If they mention "পরবর্তী ম্যাচ" / "next match" / "upcoming", set \`isUpcoming: true\`, provide \`matchStartTime\` (e.g. "আজ সন্ধ্যা ৭:৩০ মি. (07:30 PM)") and \`matchStartTimeIso\` (e.g. 3 hours from now: "${new Date(Date.now() + 3600000 * 3).toISOString()}").
   - For cricket matches from crex.com, set \`liveMatchUrl\` to the URL they gave or \`"https://crex.live/scoreboard/..."\`.
   - For football matches from sofascore.com, set \`sport: "football"\` and \`liveMatchUrl\` to \`"https://www.sofascore.com/football/match/..."\`.
2. If the user asks to delete a match, ALWAYS call \`delete_match\`.
3. If the user asks to create/add a milestone (মাইলস্টোন তৈরি/যোগ), ALWAYS call \`add_milestone\`.
4. If the user asks to delete/remove a milestone (মাইলস্টোন ডিলিট/মুছে ফেলা), ALWAYS call \`delete_milestone\`.
5. If the user asks to update score/overs/wickets/goals, ALWAYS call \`update_match\`.
6. If the user asks for latest info, live scores, or suggestions (সর্বশেষ তথ্য / সাজেস্ট কর), call \`suggest_latest_matches\` and provide a helpful summary of current live & upcoming cricket and football matches.`;

        try {
          const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: userPrompt,
            config: {
              systemInstruction,
              tools: [
                {
                  functionDeclarations: [
                    addMatchDecl,
                    deleteMatchDecl,
                    addMilestoneDecl,
                    deleteMilestoneDecl,
                    updateMatchDecl,
                    switchViewDecl,
                    suggestLatestDecl
                  ]
                }
              ]
            }
          });

          if (response.functionCalls && response.functionCalls.length > 0) {
            for (const fc of response.functionCalls) {
              actions.push({
                type: fc.name,
                args: fc.args || {}
              });
            }
          }

          if (response.text) {
            replyText = response.text;
          }

          const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
          if (Array.isArray(chunks)) {
            for (const ch of chunks) {
              if (ch?.web?.uri) {
                groundingLinks.push({
                  title: ch.web.title || ch.web.uri,
                  uri: ch.web.uri
                });
              }
            }
          }
        } catch (aiErr: any) {
          console.warn("[AI Assistant] Gemini call warning, using deterministic parser:", aiErr?.message);
        }
      }

      // Deterministic Fallback & Action Enricher:
      // Ensures commands ALWAYS execute even if the model only returned text or was rate-limited
      const lower = userPrompt.toLowerCase();
      // Convert Bengali digits to English digits for number parsing
      const bnToEnDigits = (s: string) =>
        s.replace(/[০-৯]/g, (d) => String("০১২৩৪৫৬৭৮৯".indexOf(d)));
      const normalizedPrompt = bnToEnDigits(userPrompt);

      if (actions.length === 0) {
        const isDelete = /ডিলিট|মুছে|মুছ|রিমুভ|বাদ|delete|remove/i.test(normalizedPrompt);
        const isMilestone = /মাইলস্টোন|মাইস্টোন|টার্গেট|milestone|target/i.test(normalizedPrompt);
        const isAdd = /যুক্ত|যোগ|তৈরি|তৈরী|অ্যাড|add|create|connect|কানেক্ট/i.test(normalizedPrompt);
        const isSuggest = /সাজেস্ট|সর্বশেষ|তথ্য|আপডেট|খবর|লাইভ কি|suggest|latest|info|news/i.test(normalizedPrompt);

        if (isMilestone && isDelete) {
          const nums = normalizedPrompt.match(/\d+(?:\.\d+)?/g)?.map(Number) || [];
          const deleteAll = /সব|সকল|all/i.test(normalizedPrompt);
          actions.push({
            type: "delete_milestone",
            args: {
              over: nums[0],
              runs: nums[1],
              deleteAll,
              deleteLast: !deleteAll && nums.length === 0
            }
          });
        } else if (isMilestone && (isAdd || /\d+/.test(normalizedPrompt))) {
          const ovMatch = normalizedPrompt.match(/(\d+(?:\.\d+)?)\s*(?:ওভার|ওভারে|over|ov)/i);
          const runMatch = normalizedPrompt.match(/(\d+)\s*(?:রান|রানের|run|runs)/i);
          const nums = normalizedPrompt.match(/\d+(?:\.\d+)?/g)?.map(Number) || [];
          const over = ovMatch ? parseFloat(ovMatch[1]) : (nums[0] && nums[0] <= 50 ? nums[0] : 10);
          const runs = runMatch ? parseInt(runMatch[1], 10) : (nums[1] || (nums[0] > 50 ? nums[0] : 85));
          const isLess = /কম|আন্ডার|less|under/i.test(normalizedPrompt);
          actions.push({
            type: "add_milestone",
            args: {
              over,
              runs,
              condition: isLess ? "lessOrEqual" : "more"
            }
          });
        } else if (isDelete && !isMilestone) {
          const deleteAll = /সব|সকল|all/i.test(normalizedPrompt);
          let teamHint = "current";
          if (/বাংলাদেশ|bangladesh|ban/i.test(normalizedPrompt)) teamHint = "Bangladesh";
          else if (/ভারত|ইন্ডিয়া|ইন্ডিয়া|india|ind/i.test(normalizedPrompt)) teamHint = "India";
          else if (/রিয়াল|রিয়াল|real madrid/i.test(normalizedPrompt)) teamHint = "Real Madrid";
          else if (/ক্রোয়েশিয়া|croatia/i.test(normalizedPrompt)) teamHint = "Croatia";
          actions.push({
            type: "delete_match",
            args: {
              teamOrMatchName: teamHint,
              deleteAll
            }
          });
        } else if (isAdd || /crex|sofascore|cricbuzz|espncricinfo|বনাম|vs\b|https?:\/\//i.test(normalizedPrompt)) {
          const urlMatch = userPrompt.match(/https?:\/\/[^\s]+/i);
          const pastedUrl = urlMatch ? urlMatch[0] : "";
          const isFb = /ফুটবল|football|soccer|sofascore|লাল লিগা|চ্যাম্পিয়ন্স|প্রিমিয়ার|রিয়াল|বার্সেলোনা|আর্জেন্টিনা|ব্রাজিল/i.test(normalizedPrompt);
          const isUpc = /পরবর্তী|আপকামিং|সামনের|আগামী|next|upcoming|future/i.test(normalizedPrompt);

          let t1 = "Bangladesh";
          let t2 = "India";

          // Check explicit "Team A বনাম/vs Team B"
          const vsMatch = userPrompt.match(/([A-Za-z\u0980-\u09FF\s.]+?)\s+(?:বনাম|vs\.?|v\/s|ভার্সেস)\s+([A-Za-z\u0980-\u09FF\s.]+)/i);
          if (vsMatch) {
            const cleanT = (raw: string) =>
              raw
                .replace(/.*(?:থেকে|ক্রিকেট|ফুটবলের|ফুটবল|বা|লিংক|ম্যাচটি|পরবর্তী)\s+/gi, "")
                .replace(/\s+(?:এর|পরবর্তী|ম্যাচটি|ম্যাচ|এখানে|যুক্ত|যোগ|কর|করো|ডিলিট|দাও).*/gi, "")
                .trim();
            const cand1 = cleanT(vsMatch[1]);
            const cand2 = cleanT(vsMatch[2]);
            if (cand1) t1 = /বাংলাদেশ/i.test(cand1) ? "Bangladesh" : /ভারত|ইন্ডিয়া|ইন্ডিয়া/i.test(cand1) ? "India" : cand1;
            if (cand2) t2 = /ভারত|ইন্ডিয়া|ইন্ডিয়া/i.test(cand2) ? "India" : /বাংলাদেশ/i.test(cand2) ? "Bangladesh" : cand2;
          }

          const nextIso = new Date(Date.now() + 3600000 * 3).toISOString();
          actions.push({
            type: "add_match",
            args: {
              sport: isFb ? "football" : "cricket",
              team1: t1,
              team2: t2,
              name: `${t1} vs ${t2}`,
              isUpcoming: isUpc,
              matchStartTime: isUpc ? "আজ সন্ধ্যা ৭:৩০ মি. (07:30 PM)" : undefined,
              matchStartTimeIso: isUpc ? nextIso : undefined,
              liveMatchUrl: pastedUrl || (isFb
                ? `https://www.sofascore.com/football/match/${t1.toLowerCase().replace(/\s+/g, "-")}-${t2.toLowerCase().replace(/\s+/g, "-")}${isUpc ? "/upcoming" : ""}`
                : `https://crex.live/scoreboard/${t1.toLowerCase().replace(/\s+/g, "-")}-vs-${t2.toLowerCase().replace(/\s+/g, "-")}${isUpc ? "-upcoming" : "-live"}`)
            }
          });
        } else if (isSuggest) {
          actions.push({
            type: "suggest_latest_matches",
            args: { sportFilter: "all" }
          });
        }
      }

      // Enrich any add_match action if it has a liveMatchUrl or matches a live game
      for (let i = 0; i < actions.length; i++) {
        const act = actions[i];
        if (act.type === "add_match" && act.args) {
          const isExplicitlyUpcoming = Boolean(act.args.isUpcoming) || /পরবর্তী|আপকামিং|next|upcoming/i.test(userPrompt);
          if (isExplicitlyUpcoming) {
            act.args.isUpcoming = true;
            if (!act.args.matchStartTime) {
              act.args.matchStartTime = "আজ সন্ধ্যা ৭:৩০ মি. (07:30 PM)";
            }
            if (!act.args.matchStartTimeIso) {
              act.args.matchStartTimeIso = new Date(Date.now() + 3600000 * 3).toISOString();
            }
            if (!act.args.liveMatchUrl) {
              const slug1 = String(act.args.team1 || "ban").toLowerCase().replace(/\s+/g, "-");
              const slug2 = String(act.args.team2 || "ind").toLowerCase().replace(/\s+/g, "-");
              act.args.liveMatchUrl = act.args.sport === "football"
                ? `https://www.sofascore.com/football/match/${slug1}-${slug2}/upcoming`
                : `https://crex.live/scoreboard/${slug1}-vs-${slug2}-upcoming`;
            }
          } else if (act.args.liveMatchUrl && /^https?:\/\//i.test(act.args.liveMatchUrl)) {
            try {
              const scraped = await parseLiveCricketUrl(act.args.liveMatchUrl);
              if (scraped && scraped.success) {
                act.args = {
                  ...scraped,
                  ...act.args,
                  team1: act.args.team1 && act.args.team1 !== "Team 1" ? act.args.team1 : scraped.team1,
                  team2: act.args.team2 && act.args.team2 !== "Team 2" ? act.args.team2 : scraped.team2,
                  isUpcoming: Boolean(act.args.isUpcoming ?? scraped.isUpcoming)
                };
              }
            } catch {}
          }
        }
      }

      // Build clear confirmation reply if replyText is empty
      if (!replyText) {
        if (actions.length > 0) {
          const summaries = actions.map((a) => {
            if (a.type === "add_match") {
              const sp = a.args.sport === "football" ? "⚽ ফুটবল" : "🏏 ক্রিকেট";
              const st = a.args.isUpcoming ? ` (আপকামিং - কাউন্টডাউন সহ: ${a.args.matchStartTime || "শীঘ্রই"})` : " (লাইভ)";
              return lang === "bn"
                ? `✅ **${a.args.team1} বনাম ${a.args.team2}** (${sp}) ম্যাচটি স্কোরবোর্ডে যুক্ত করা হয়েছে${st}।`
                : `✅ Added **${a.args.team1} vs ${a.args.team2}** (${a.args.sport})${st}.`;
            }
            if (a.type === "delete_match") {
              return lang === "bn"
                ? `🗑️ অনুরোধ অনুযায়ী ম্যাচটি তালিকা থেকে ডিলিট করা হয়েছে।`
                : `🗑️ Deleted the requested match from the list.`;
            }
            if (a.type === "add_milestone") {
              return lang === "bn"
                ? `🎯 নতুন টার্গেট মাইলস্টোন তৈরি করা হয়েছে: **${a.args.over} ওভারে ${a.args.runs} রান**।`
                : `🎯 Created new target milestone: **${a.args.runs} runs in ${a.args.over} overs**.`;
            }
            if (a.type === "delete_milestone") {
              return lang === "bn"
                ? `🗑️ মাইলস্টোনটি সফলভাবে ডিলিট করা হয়েছে।`
                : `🗑️ Deleted the target milestone.`;
            }
            if (a.type === "update_match") {
              return lang === "bn"
                ? `⚡ ম্যাচের স্কোর ও তথ্য আপডেট করা হয়েছে।`
                : `⚡ Updated match score and details.`;
            }
            return lang === "bn"
              ? `✨ নিচে সর্বশেষ লাইভ ও পরবর্তী ম্যাচগুলোর তথ্য দেওয়া হলো:`
              : `✨ Here are the latest live and upcoming matches:`;
          });
          replyText = summaries.join("\n\n");
        } else {
          replyText = lang === "bn"
            ? "নিচে ক্রিকেট ও ফুটবলের সর্বশেষ লাইভ ও আসন্ন ম্যাচের তালিকা দেওয়া হলো। যেকোনো ম্যাচ এক ক্লিকে যুক্ত করতে **+ যুক্ত করুন** বাটনে ক্লিক করুন:"
            : "Here are the latest live and upcoming cricket and football matches. Click **+ Add Match** to add any match directly:";
        }
      }

      return res.json({
        success: true,
        reply: replyText,
        actions,
        suggestions: suggestions.slice(0, 6),
        groundingLinks
      });
    } catch (err: any) {
      console.error("[AI Assistant Error]:", err?.message);
      return res.status(500).json({
        error: err?.message || "Failed to process AI Assistant request"
      });
    }
  });

  // Safe handler for Service Worker and Web Manifest to prevent ENOENT crashes
  app.get(["/sw.js", "/registerSW.js", "/manifest.webmanifest"], (req, res) => {
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    const filename = path.basename(req.path);
    const distFile = path.join(process.cwd(), "dist", filename);
    const publicFile = path.join(process.cwd(), "public", filename);

    if (fs.existsSync(distFile)) {
      return res.sendFile(distFile);
    }
    if (fs.existsSync(publicFile)) {
      return res.sendFile(publicFile);
    }

    if (filename.endsWith(".js")) {
      res.setHeader("Content-Type", "application/javascript");
      return res.send(`// Service Worker fallback
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', () => self.clients.claim());
`);
    } else if (filename.endsWith(".webmanifest") || filename.endsWith(".json")) {
      res.setHeader("Content-Type", "application/manifest+json");
      return res.json({
        name: "⚽🏏 .score",
        short_name: ".score",
        start_url: "/",
        display: "standalone"
      });
    }
    return res.status(404).end();
  });

  // Detect dev vs production mode accurately
  const lifecycle = process.env.npm_lifecycle_event || "";
  const isTsxRuntime =
    lifecycle === "dev" ||
    process.argv.some((a) => a.includes("tsx")) ||
    process.execArgv.some((a) => a.includes("tsx"));
  const isExplicitProduction =
    process.env.NODE_ENV === "production" || lifecycle === "start";

  const candidateDirs = [
    path.join(process.cwd(), "dist"),
    path.join(__dirname, "dist"),
    path.resolve("dist")
  ];
  const distPath = candidateDirs.find(d => fs.existsSync(path.join(d, "index.html"))) || candidateDirs[0];
  const distExists = fs.existsSync(path.join(distPath, "index.html"));

  const isProduction = isExplicitProduction && !isTsxRuntime;
  console.log(`[Server] Starting on port ${PORT} in ${isProduction ? "PRODUCTION (serving dist)" : "DEVELOPMENT (Vite middleware)"} mode`);

  let viteMiddleware: any = null;
  app.use((req, res, next) => {
    if (viteMiddleware) {
      return viteMiddleware(req, res, next);
    }
    next();
  });

  if (distExists) {
    app.use(express.static(distPath, {
      index: isProduction ? "index.html" : false,
      maxAge: isProduction ? "1d" : 0,
      setHeaders: (res, filePath) => {
        if (filePath.endsWith(".html")) {
          res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        }
      }
    }));
  }

  app.get("*", (req, res, next) => {
    if (viteMiddleware) {
      return next();
    }
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    const indexPath = path.join(distPath, "index.html");
    if (fs.existsSync(indexPath)) {
      return res.sendFile(indexPath, (err) => {
        if (err && !res.headersSent) {
          res.status(200).send(`<!DOCTYPE html><html><head><title>Remix Cricket Score Master</title><meta http-equiv="refresh" content="2"></head><body style="font-family:sans-serif;background:#090d16;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;"><h2>Loading Remix Cricket Score Master...</h2></body></html>`);
        }
      });
    }
    return res.status(200).send(`<!DOCTYPE html><html><head><title>Remix Cricket Score Master</title><meta http-equiv="refresh" content="2"></head><body style="font-family:sans-serif;background:#090d16;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;"><h2>Loading Remix Cricket Score Master...</h2></body></html>`);
  });

  // Global error handler to catch unexpected file-send or server errors
  app.use((err: any, _req: any, res: any, _next: any) => {
    console.error("[Server Error]", err?.message || err);
    if (!res.headersSent) {
      res.status(err?.status || 500).json({ error: err?.message || "Internal server error" });
    }
  });

  // Listen immediately with automatic EADDRINUSE retry so port 3000 is always bound reliably
  const bindServerWithRetry = (attempt = 1) => {
    const srv = app.listen(PORT, "0.0.0.0", () => {
      serverInstance = srv;
      console.log(`[Server] Live and listening on http://0.0.0.0:${PORT}`);
      console.log(`  ➜  Local:   http://localhost:${PORT}/`);
    });

    srv.on("error", (err: any) => {
      if (err?.code === "EADDRINUSE" && attempt <= 20) {
        console.warn(`[Server] Port ${PORT} busy (attempt ${attempt}/20), retrying in 250ms...`);
        setTimeout(() => bindServerWithRetry(attempt + 1), 250);
      } else {
        console.error("[Server] Failed to bind port:", err);
      }
    });
  };

  bindServerWithRetry();

  if (!isProduction) {
    try {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true, hmr: false },
        appType: "spa",
      });
      viteMiddleware = vite.middlewares;
      console.log("[Server] Vite dev middleware mounted successfully");
    } catch (viteErr: any) {
      console.error("[Server] Failed to initialize Vite middleware, falling back to dist:", viteErr?.message || viteErr);
    }
  }
}

startServer();
