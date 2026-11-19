import { CalendarCheck, Crosshair, Flag, Globe2, Landmark, MapPinned, Puzzle, ScanSearch, Search, Shapes, Users, Utensils } from "lucide-react";

export const GAMES = [
  // World
  { id: "find-country", group: "world", href: "/games/find-country", title: "Find the Country", blurb: "Spin the globe and tap the country", icon: Search, bg: "#e3ebfd", fg: "#2f5fd0" },
  { id: "match-flags", group: "world", href: "/games/match-flags", title: "Match the Flags", blurb: "Drag each flag to its country", icon: Flag, bg: "#ffe8de", fg: "#d9592a" },
  { id: "guess-capital", group: "world", href: "/games/guess-capital", title: "Guess the Capital", blurb: "Pick the capital city", icon: Landmark, bg: "#fff4d6", fg: "#b47c00" },
  { id: "landmark-detective", group: "world", href: "/games/landmark-detective", title: "Landmark Detective", blurb: "Which country is this place in?", icon: MapPinned, bg: "#efe8fd", fg: "#7b55e0" },
  { id: "food-explorer", group: "world", href: "/games/food-explorer", title: "Food Explorer", blurb: "Where does this dish come from?", icon: Utensils, bg: "#dcf5ea", fg: "#1d7a52" },
  { id: "continent-challenge", group: "world", href: "/games/continent-challenge", title: "Continent Challenge", blurb: "Sort countries into continents", icon: Shapes, bg: "#e0f4f1", fg: "#1f8a7a" },
  { id: "identify-country", group: "world", href: "/games/identify-country", title: "Identify the Country", blurb: "Which country is glowing?", icon: Globe2, bg: "#e3ebfd", fg: "#356ae6" },
  { id: "world-jigsaw", group: "world", href: "/puzzle#world", title: "World Map Jigsaw", blurb: "Put a continent back together", icon: Puzzle, bg: "#ffe8de", fg: "#c2410c" },
  // India
  { id: "identify-state", group: "india", href: "/games/identify-state", title: "Identify the State", blurb: "Which state is glowing?", icon: ScanSearch, bg: "#e3ebfd", fg: "#356ae6" },
  { id: "find-capital", group: "india", href: "/games/find-capital", title: "Find the State Capital", blurb: "Tap the state that owns the capital", icon: Landmark, bg: "#fff4d6", fg: "#c58a00" },
  { id: "district-explorer", group: "india", href: "/games/district-explorer", title: "District Explorer", blurb: "Find districts on the map", icon: Crosshair, bg: "#dcf5ea", fg: "#1d7a52" },
  { id: "arrange-states", group: "india", href: "/puzzle/india", title: "Arrange the States", blurb: "Put every state in its place", icon: Puzzle, bg: "#ffe8de", fg: "#d9592a" },
  { id: "neighbours", group: "india", href: "/games/neighbours", title: "Neighbour Challenge", blurb: "Find all the neighbours", icon: Users, bg: "#efe8fd", fg: "#7b55e0" },
  { id: "daily", group: "daily", href: "/games/daily", title: "Daily Challenge", blurb: "Five new questions every day", icon: CalendarCheck, bg: "#fff4d6", fg: "#b47c00" },
] as const;
