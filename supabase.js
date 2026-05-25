/*!
 * Supabase JavaScript Client v2.0.0
 * (c) 2026 Supabase
 * Rilasciato sotto licenza MIT.
 */
(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define(['exports'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.supabase = {}));
})(this, (function (exports) { 'use strict';

    class SupabaseAuthClient {
        constructor(url, headers) {
            this.url = url + '/auth/v1';
            this.headers = headers;
        }
        async signUp(credentials) {
            try {
                const res = await fetch(`${this.url}/signup`, {
                    method: 'POST',
                    headers: { ...this.headers, 'Content-Type': 'application/json' },
                    body: JSON.stringify(credentials)
                });
                const json = await res.json();
                if (json.error) return { data: null, error: json.error };
                return { data: json, error: null };
            } catch (e) {
                return { data: null, error: { message: e.message } };
            }
        }
        async signInWithPassword(credentials) {
            try {
                const res = await fetch(`${this.url}/token?grant_type=password`, {
                    method: 'POST',
                    headers: { ...this.headers, 'Content-Type': 'application/json' },
                    body: JSON.stringify(credentials)
                });
                const json = await res.json();
                if (json.error) return { data: null, error: json.error };
                return { data: json, error: null };
            } catch (e) {
                return { data: null, error: { message: e.message } };
            }
        }
        async getSession() {
            return { data: { session: null }, error: null };
        }
    }
    class SupabaseRealtimeClient {
        constructor(url, headers) {
            this.url = url + '/rest/v1';
            this.headers = headers;
        }
        from(table) {
            const baseUrl = `${this.url}/${table}`;
            const headers = { ...this.headers, 'Content-Type': 'application/json' };
            return {
                select: async () => {
                    try {
                        const res = await fetch(baseUrl, { method: 'GET', headers });
                        const json = await res.json();
                        return { data: json, error: null };
                    } catch (e) { return { data: null, error: e }; }
                },
                insert: async (data) => {
                    try {
                        const res = await fetch(baseUrl, {
                            method: 'POST',
                            headers: { ...headers, 'Prefer': 'return=representation' },
                            body: JSON.stringify(data)
                        });
                        const json = await res.json();
                        return { data: json, error: null };
                    } catch (e) { return { data: null, error: e }; }
                }
            };
        }
    }

    class SupabaseClient {
        constructor(url, key) {
            this.url = url;
            this.key = key;
            this.headers = { 'apikey': key, 'Authorization': `Bearer ${key}` };
            this.auth = new SupabaseAuthClient(url, this.headers);
            this.realtime = new SupabaseRealtimeClient(url, this.headers);
        }
        from(table) {
            return this.realtime.from(table);
        }
    }

    exports.createClient = (url, key) => new SupabaseClient(url, key);

    Object.defineProperty(exports, '__esModule', { value: true });

})));
