import { AUTH_TOKEN_KEY } from "../config/constants.js";

export function getAccessToken(){ return localStorage.getItem(AUTH_TOKEN_KEY) || ""; }

export function setAccessToken(token){ if(token) localStorage.setItem(AUTH_TOKEN_KEY,token); else localStorage.removeItem(AUTH_TOKEN_KEY); }
