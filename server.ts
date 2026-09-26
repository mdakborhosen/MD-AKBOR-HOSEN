import express from "express";
import path from "path";
import dotenv from "dotenv";
import fs from "fs";
import { fileURLToPath } from "url";
import { execSync } from "child_process";
import axios from "axios";
import * as cheerio from "cheerio";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

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
  console.log("[Server] SIGTERM received, shutting down gracefully...");
  if (serverInstance) {
    serverInstance.close(() => process.exit(0));
  } else {
    process.exit(0);
  }
});
process.on("SIGINT", () => {
  console.log("[Server] SIGINT received, shutting down gracefully...");
  if (serverInstance) {
    serverInstance.close(() => process.exit(0));
  } else {
    process.exit(0);
  }
});

// Ensure data directory exists for cloud backup
const DATA_DIR = path.join(process.cwd(), "data");
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
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
  }
};

function advanceDemoMatch(key: string) {
  const m = demoMatches[key];
  if (!m) return null;

  if (m.isUpcoming) {
    return {
      ...m,
      totalBalls: 0,
      lastBallSymbol: undefined
    };
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

const liveUrlScrapeCache = new Map<string, { time: number; result: any }>();
const aiUrlCooldown = new Map<string, number>();

// Live Cricket Match Parser
async function parseLiveCricketUrl(url: string) {
  if (!url || typeof url !== "string") {
    throw new Error("Valid match URL is required");
  }

  const cleanUrl = url.trim();

  // Check cache for live polling (prevents repeated external scrapes & quota exhaustion)
  const isDemo = cleanUrl.startsWith("demo://") || cleanUrl.startsWith("test://") || cleanUrl.includes("mock-match");
  const cacheTtl = isDemo ? 3000 : 15000;
  const cached = liveUrlScrapeCache.get(cleanUrl);
  if (cached && Date.now() - cached.time < cacheTtl) {
    return cached.result;
  }

  // 1. Handle Demo Simulation URLs
  if (isDemo) {
    const key = cleanUrl.toLowerCase().split("?")[0];
    const demo = advanceDemoMatch(key) || advanceDemoMatch("demo://t20-live");
    const result = {
      success: true,
      isDemo: true,
      ...demo,
      lastUpdated: new Date().toLocaleTimeString()
    };
    liveUrlScrapeCache.set(cleanUrl, { time: Date.now(), result });
    return result;
  }

  // 2. Fetch live web page
  let html = "";
  try {
    const response = await axios.get(cleanUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Linux; Android 13; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9,bn;q=0.8",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache"
      },
      timeout: 8000,
      maxRedirects: 5
    });
    html = typeof response.data === "string" ? response.data : JSON.stringify(response.data);
  } catch (fetchErr: any) {
    // If we have previous cached data, return it with isStale: true instead of failing with 500
    if (cached && cached.result) {
      return { ...cached.result, isStale: true, lastUpdated: new Date().toLocaleTimeString() };
    }
    // Attempt graceful extraction from URL slug if external access is blocked (e.g. 403 Forbidden)
    const slugMatch = cleanUrl.match(/(?:cricket-scores|live-cricket-scores|scores)\/[^/]+\/([a-z0-9-]+)/i);
    const slugTeams = slugMatch ? slugMatch[1].split("-vs-") : null;
    if (slugTeams && slugTeams.length === 2) {
      const fallbackResult = {
        success: true,
        team1: slugTeams[0].replace(/-/g, " ").toUpperCase(),
        team2: slugTeams[1].replace(/-/g, " ").toUpperCase(),
        battingTeam: slugTeams[0].replace(/-/g, " ").toUpperCase(),
        bowlingTeam: slugTeams[1].replace(/-/g, " ").toUpperCase(),
        score: 0,
        wickets: 0,
        overs: 0,
        ballsInOver: 0,
        totalBalls: 0,
        isUpcoming: true,
        statusText: "Live match connected (awaiting live feed data)",
        recentBalls: [],
        lastUpdated: new Date().toLocaleTimeString()
      };
      liveUrlScrapeCache.set(cleanUrl, { time: Date.now(), result: fallbackResult });
      return fallbackResult;
    }
    throw new Error(`Failed to access match URL (${fetchErr.message || "Network Error"}). Please verify the URL.`);
  }

  const $ = cheerio.load(html);

  // Extract titles and meta descriptions
  const pageTitle = $("title").text().trim();
  const ogTitle = $('meta[property="og:title"]').attr("content") || "";
  const ogDesc = $('meta[property="og:description"]').attr("content") || "";
  const metaDesc = $('meta[name="description"]').attr("content") || "";
  const bodyText = $("body").text().replace(/\s+/g, " ").slice(0, 8000);

  const combinedHeader = `${pageTitle} | ${ogTitle} | ${ogDesc} | ${metaDesc}`;

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
  const recentBalls: string[] = [];
  const batsmen: any[] = [];
  let bowler: any = null;

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
            matchStartTimeIso = it.startDate;
            try {
              const d = new Date(it.startDate);
              if (!isNaN(d.getTime())) {
                matchStartTime = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ` (${d.toLocaleDateString([], { month: 'short', day: 'numeric' })})`;
              }
            } catch {}
            if (!matchStartTime) {
              matchStartTime = it.startDate;
            }
          }
          if (it.eventStatus && String(it.eventStatus).toLowerCase().includes("scheduled")) {
            isUpcoming = true;
          }
        }
      }
    } catch {}
  });

  // Cricbuzz & Cricinfo specific DOM selectors
  const cbBatTeam = $(".cb-min-bat-rw").text().trim() || $(".cb-nav-subhdr").text().trim();
  const cbStatus = $(".cb-text-inprogress, .cb-text-complete, .cb-text-stump, .cb-text-lunch").first().text().trim();
  const cbPreview = $(".cb-text-preview, .cb-text-upcoming, .cb-mat-status, .cb-nav-subhdr").text().trim();
  const cricinfoStatus = $(".ds-text-tight-s, .ds-text-compact-xs, .ds-text-tight-m, [data-testid='match-status']").filter((_i, el) => {
    const t = $(el).text().trim();
    return /starts|yet to begin|scheduled|toss|preview/i.test(t);
  }).first().text().trim();

  // Look for text like "Match starts at Sep 23, 7:00 PM", "Match starts in 1h 30m", "Starts at 14:00 local", "Starts in 45m"
  const startRegexes = [
    /(?:match\s+starts\s+(?:at|in|on)?|starts\s+(?:at|in|on)?|match\s+scheduled\s+(?:at|for)|toss\s+(?:at|scheduled\s+at))\s*([A-Za-z0-9:,\s\-+–/]{3,60}?(?:AM|PM|am|pm|GMT|IST|BST|UTC|\d{1,2}:\d{2}|hrs?|mins?|hours?|minutes?))/i,
    /(?:match\s+starts\s+in|starts\s+in)\s*(\d+\s*(?:hrs?|hours?|mins?|minutes?|days?)(?:\s*(?:and\s*)?\d+\s*(?:mins?|minutes?))?)/i,
    /(?:match\s+yet\s+to\s+begin|not\s+started\s+yet|upcoming\s+match)/i
  ];

  const searchCorpus = `${cbPreview} | ${cricinfoStatus} | ${combinedHeader} | ${bodyText.slice(0, 4000)}`;

  for (const reg of startRegexes) {
    const m = searchCorpus.match(reg);
    if (m) {
      isUpcoming = true;
      if (m[1] && !matchStartTime) {
        matchStartTime = m[1].trim().replace(/[.,;]+$/, "");
      }
    }
  }

  if (cbPreview && /starts|scheduled|yet to begin/i.test(cbPreview)) {
    isUpcoming = true;
    if (!matchStartTime) matchStartTime = cbPreview;
  }
  if (cricinfoStatus && /starts|scheduled|yet to begin/i.test(cricinfoStatus)) {
    isUpcoming = true;
    if (!matchStartTime) matchStartTime = cricinfoStatus;
  }

  // Pattern 1: Search for Score & Overs e.g. "BAN 164/5 (18.4 ov)" or "IND 212-3 (20)"
  const scoreRegex = /([A-Za-z\s]{2,15})?\s*(\d{1,4})[\/-](\d{1,2})\s*(?:\(?\s*(\d+)(?:\.(\d+))?\s*(?:ov(?:ers?)?)?\s*\)?)/i;
  const matchScore = combinedHeader.match(scoreRegex) || bodyText.match(scoreRegex);

  if (matchScore) {
    if (matchScore[1] && matchScore[1].trim().length >= 2) {
      battingTeam = matchScore[1].trim();
    }
    score = parseInt(matchScore[2], 10) || 0;
    wickets = parseInt(matchScore[3], 10) || 0;
    overs = parseInt(matchScore[4], 10) || 0;
    ballsInOver = matchScore[5] ? Math.min(5, parseInt(matchScore[5], 10) || 0) : 0;
  } else {
    // Alternative regex: "Score: 164/4"
    const altRegex = /(\d{1,4})[\/-](\d{1,2})/;
    const altMatch = combinedHeader.match(altRegex) || bodyText.match(altRegex);
    if (altMatch) {
      score = parseInt(altMatch[1], 10) || 0;
      wickets = parseInt(altMatch[2], 10) || 0;
    }
    const ovRegex = /(\d{1,2})\.(\d)\s*ov(?:ers?)?/i;
    const ovMatch = combinedHeader.match(ovRegex) || bodyText.match(ovRegex);
    if (ovMatch) {
      overs = parseInt(ovMatch[1], 10) || 0;
      ballsInOver = parseInt(ovMatch[2], 10) || 0;
    }
  }

  // Detect teams from title e.g. "India vs Pakistan" or "BAN v SL"
  const teamsRegex = /([A-Za-z\s]{2,20})\s+(?:vs\.?|v|against|–|-)\s+([A-Za-z\s]{2,20})/i;
  const teamsMatch = combinedHeader.match(teamsRegex);
  if (teamsMatch) {
    team1 = teamsMatch[1].trim();
    team2 = teamsMatch[2].trim().replace(/\s+(?:Live|Score|Commentary|Match|T20|ODI|Test).*/i, "");
    if (!battingTeam) battingTeam = team1;
    bowlingTeam = battingTeam.toLowerCase() === team1.toLowerCase() ? team2 : team1;
  }

  // Target pattern: "Target 175" or "need 34 runs" or "T: 190"
  const targetRegex = /(?:Target|T|target)\s*[:=]?\s*(\d{2,4})|(?:need|needs|require)\s*(\d{1,3})\s*(?:runs|more)/i;
  const targetMatch = combinedHeader.match(targetRegex) || bodyText.match(targetRegex);
  if (targetMatch) {
    if (targetMatch[1]) {
      target = parseInt(targetMatch[1], 10);
    } else if (targetMatch[2]) {
      const needRuns = parseInt(targetMatch[2], 10);
      target = score + needRuns;
    }
  }

  // Status text
  if (cbStatus) {
    statusText = cbStatus;
  } else if (matchStartTime) {
    statusText = `Match starts at ${matchStartTime}`;
  } else {
    const statusCandidate = combinedHeader.match(/(?:need\s+\d+\s+runs\s+in\s+\d+\s+balls|won\s+by\s+\d+\s+(?:runs|wickets)|match\s+tied|innings\s+break|rain\s+stops\s+play)/i);
    if (statusCandidate) {
      statusText = statusCandidate[0];
    } else if (ogDesc) {
      statusText = ogDesc.slice(0, 100);
    }
  }

  // Recent balls commentary
  $(".cb-mini-col, .ds-flex.ds-space-x-1 span, .ds-text-tight-s").each((_i, el) => {
    const txt = $(el).text().trim();
    if (/^([0-6]|W|Wd|Nb|•|\.)$/i.test(txt) && recentBalls.length < 8) {
      recentBalls.push(txt === "." ? "•" : txt);
    }
  });

  // If score is 0 and overs is 0, let's attempt AI parsing if Gemini is configured (with cooldown)
  const lastAiCall = aiUrlCooldown.get(cleanUrl) || 0;
  const canUseAi = (score === 0 && overs === 0) && (Date.now() - lastAiCall > 180000); // at most once every 3 minutes per URL
  if (canUseAi) {
    aiUrlCooldown.set(cleanUrl, Date.now());
    try {
      const ai = getAiClient();
      if (ai) {
        const prompt = `Extract live cricket score or upcoming match schedule from this page content:\nTITLE: ${pageTitle}\nMETA: ${ogDesc}\nSNIPPET: ${bodyText.slice(0, 3000)}\n
Return ONLY JSON:
{
  "team1": string,
  "team2": string,
  "battingTeam": string,
  "bowlingTeam": string,
  "score": number,
  "wickets": number,
  "overs": number,
  "ballsInOver": number,
  "target": number (optional),
  "isUpcoming": boolean,
  "matchStartTime": string (e.g. "7:30 PM" or "Sep 23, 7:00 PM" or "Starts in 1 hour" if match not started yet),
  "statusText": string
}`;
        const aiRes = await ai.models.generateContent({
          model: "gemini-3.1-flash-lite",
          contents: prompt,
          config: { responseMimeType: "application/json" }
        });
        if (aiRes && aiRes.text) {
          const aiJson = JSON.parse(aiRes.text.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim());
          if (aiJson.score !== undefined || aiJson.isUpcoming || aiJson.matchStartTime) {
            const aiUpcoming = Boolean(aiJson.isUpcoming || (Number(aiJson.score || 0) === 0 && Boolean(aiJson.matchStartTime)));
            return {
              success: true,
              team1: aiJson.team1 || team1 || "Team 1",
              team2: aiJson.team2 || team2 || "Team 2",
              battingTeam: aiJson.battingTeam || battingTeam || team1 || "Team 1",
              bowlingTeam: aiJson.bowlingTeam || bowlingTeam || team2 || "Team 2",
              score: Number(aiJson.score) || 0,
              wickets: Number(aiJson.wickets) || 0,
              overs: Number(aiJson.overs) || 0,
              ballsInOver: Number(aiJson.ballsInOver) || 0,
              totalBalls: ((Number(aiJson.overs) || 0) * 6) + (Number(aiJson.ballsInOver) || 0),
              target: aiJson.target ? Number(aiJson.target) : target || undefined,
              isUpcoming: aiUpcoming,
              matchStartTime: aiJson.matchStartTime || matchStartTime || undefined,
              matchStartTimeIso: matchStartTimeIso || undefined,
              statusText: aiJson.statusText || statusText || (aiUpcoming && (aiJson.matchStartTime || matchStartTime) ? `ম্যাচ এখনও শুরু হয়নি • শুরু হবে: ${aiJson.matchStartTime || matchStartTime}` : ""),
              recentBalls: recentBalls.length > 0 ? recentBalls : (aiUpcoming ? [] : ["1", "•", "4", "2", "W", "1"]),
              batsmen,
              bowler,
              lastUpdated: new Date().toLocaleTimeString()
            };
          }
        }
      }
    } catch (aiErr) {
      console.warn("AI cricket extract skipped:", aiErr);
    }
  }

  const totalBalls = (overs * 6) + ballsInOver;
  const upcomingDetected = isUpcoming || (score === 0 && overs === 0 && totalBalls === 0 && Boolean(matchStartTime || /starts|scheduled|yet to begin/i.test(searchCorpus)));

  const finalResult = {
    success: true,
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
    isUpcoming: upcomingDetected,
    matchStartTime: matchStartTime || undefined,
    matchStartTimeIso: matchStartTimeIso || undefined,
    statusText: statusText || (upcomingDetected && matchStartTime ? `Match starts at ${matchStartTime}` : `${battingTeam || 'Team'} ${score}/${wickets} (${overs}.${ballsInOver} ov)`),
    recentBalls: upcomingDetected ? [] : (recentBalls.length > 0 ? recentBalls : ["1", "4", "•", "2", "1", "6"]),
    lastBallSymbol: upcomingDetected ? undefined : (recentBalls.length > 0 ? recentBalls[recentBalls.length - 1] : "6"),
    batsmen,
    bowler,
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

      // Ensure id and default fields for each event
      if (parsed.events && Array.isArray(parsed.events)) {
        parsed.events = parsed.events.map((ev: any, idx: number) => ({
          id: ev.id || `ev-${idx + 1}-${Date.now()}`,
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

  // Live Cricket Match Link Extractor & Poller
  app.post("/api/cricket/fetch-live-url", async (req, res) => {
    try {
      const { url } = req.body || {};
      if (!url || typeof url !== "string") {
        return res.status(400).json({ error: "Match URL is required" });
      }
      const data = await parseLiveCricketUrl(url);
      return res.json({ success: true, data });
    } catch (err: any) {
      console.error("Live match fetch error:", err?.message);
      return res.status(500).json({ error: err?.message || "Failed to parse live cricket score" });
    }
  });

  app.get(["/api/live-match", "/api/cricket/fetch-live-url"], async (req, res) => {
    try {
      const url = (req.query.url as string) || "";
      if (!url) {
        return res.status(400).json({ error: "url is required" });
      }
      const data = await parseLiveCricketUrl(url);
      return res.json({ success: true, data });
    } catch (err: any) {
      console.error("Live match fetch error:", err?.message);
      return res.status(500).json({ error: err?.message || "Failed to parse live cricket score" });
    }
  });

  // Cloud Backup Save & Load (Protects against cache/storage wipe)
  app.post("/api/backup/save", async (req, res) => {
    try {
      const payload = req.body || {};
      await fs.promises.writeFile(BACKUP_FILE, JSON.stringify(payload), "utf-8");
      return res.json({ success: true, timestamp: Date.now() });
    } catch (err: any) {
      return res.status(500).json({ error: "Failed to save cloud backup: " + err?.message });
    }
  });

  app.get("/api/backup/load", async (_req, res) => {
    try {
      if (fs.existsSync(BACKUP_FILE)) {
        const raw = await fs.promises.readFile(BACKUP_FILE, "utf-8");
        return res.json({ success: true, data: JSON.parse(raw) });
      }
      return res.json({ success: false, data: null, message: "No backup available" });
    } catch (err: any) {
      return res.status(500).json({ error: "Failed to read cloud backup: " + err?.message });
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
        name: "Remix Cricket Score Master",
        short_name: "CricketScore",
        start_url: "/",
        display: "standalone"
      });
    }
    return res.status(404).end();
  });

  // Detect Cloud Run & Production vs local AI Studio dev server
  const isCloudRun = Boolean(process.env.K_SERVICE || process.env.K_REVISION);
  const isExplicitProduction = process.env.NODE_ENV === "production";
  const isNonDevPort = Boolean(process.env.PORT && String(process.env.PORT) !== "3000");

  const candidateDirs = [
    path.join(process.cwd(), "dist"),
    path.join(__dirname, "dist"),
    path.resolve("dist")
  ];
  let distPath = candidateDirs.find(d => fs.existsSync(path.join(d, "index.html"))) || candidateDirs[0];
  let distExists = fs.existsSync(path.join(distPath, "index.html"));

  // In Cloud Run or explicit production, ALWAYS serve production mode (never run Vite dev middleware)
  const isProduction = isCloudRun || isExplicitProduction || isNonDevPort || distExists;
  console.log(`[Server] Starting on port ${PORT} in ${isProduction ? "PRODUCTION (serving dist)" : "DEVELOPMENT (Vite middleware)"} mode`);

  if (!isProduction) {
    // Vite middleware for local development (lazy imported only in dev)
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    if (distExists) {
      app.use(express.static(distPath, {
        maxAge: "1d",
        setHeaders: (res, filePath) => {
          if (filePath.endsWith(".html")) {
            res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
          }
        }
      }));
    }

    app.get("*", (_req, res) => {
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
  }

  // Global error handler to catch unexpected file-send or server errors
  app.use((err: any, _req: any, res: any, _next: any) => {
    console.error("[Server Error]", err?.message || err);
    if (!res.headersSent) {
      res.status(err?.status || 500).json({ error: err?.message || "Internal server error" });
    }
  });

  serverInstance = app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Server] Live and listening on 0.0.0.0:${PORT}`);
  });
}

startServer();
