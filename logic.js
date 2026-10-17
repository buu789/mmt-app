// logic.js
// ---------------------------------------------------------------------------
// All the money and date maths lives here. There are no buttons or screens in
// this file, so it is easy to read and to test on its own.
// ---------------------------------------------------------------------------
(function (root) {
  "use strict";

  var TYPES = ["received", "spent", "saved"];

  function pad(n) {
    return String(n).padStart(2, "0");
  }

  // Dates are always text like "2026-10-17", so they sort and compare correctly.
  function formatDate(y, m, d) {
    return String(y).padStart(4, "0") + "-" + pad(m) + "-" + pad(d);
  }

  // m is 1 to 12. Day 0 of the next month is the last day of this one.
  function daysInMonth(y, m) {
    return new Date(y, m, 0).getDate();
  }

  function todayString(now) {
    now = now || new Date();
    return formatDate(now.getFullYear(), now.getMonth() + 1, now.getDate());
  }

  function isValidDate(s) {
    if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
    var y = Number(s.slice(0, 4));
    var m = Number(s.slice(5, 7));
    var d = Number(s.slice(8, 10));
    return y >= 1970 && m >= 1 && m <= 12 && d >= 1 && d <= daysInMonth(y, m);
  }

  // ---- the financial month --------------------------------------------------
  // If your month starts on the 5th, the period containing 17 Oct is
  // 5 Oct to 4 Nov. offset 0 = this period, -1 = the one before, and so on.
  // If a month is shorter than the start day (say start day 31 in February),
  // that period simply starts on the month's last day.
  function financialPeriod(startDay, offset, now) {
    now = now || new Date();
    offset = offset || 0;
    var y = now.getFullYear();
    var m = now.getMonth() + 1;
    var d = now.getDate();

    // Start of the period that contains today.
    var sy = y;
    var sm = m;
    var sd = Math.min(startDay, daysInMonth(sy, sm));
    if (d < sd) {
      // Today is before this month's start day, so the period began last month.
      sm--;
      if (sm === 0) {
        sm = 12;
        sy--;
      }
    }

    // Move back or forward by whole months.
    var index = sy * 12 + (sm - 1) + offset;
    sy = Math.floor(index / 12);
    sm = ((index % 12) + 12) % 12 + 1;
    sd = Math.min(startDay, daysInMonth(sy, sm));

    // The next period starts one month later; ours ends the day before.
    var ny = sy;
    var nm = sm + 1;
    if (nm === 13) {
      nm = 1;
      ny++;
    }
    var nd = Math.min(startDay, daysInMonth(ny, nm));
    var end = new Date(ny, nm - 1, nd - 1); // day 0 rolls back to the previous month

    return {
      start: formatDate(sy, sm, sd),
      end: formatDate(end.getFullYear(), end.getMonth() + 1, end.getDate()),
    };
  }

  // ---- totals ---------------------------------------------------------------
  // Money is added up in paise (whole numbers) so there are no 0.1 + 0.2 errors.
  function summarize(entries, period) {
    var inPeriod = [];
    entries.forEach(function (e, i) {
      if (e.date >= period.start && e.date <= period.end) inPeriod.push({ e: e, i: i });
    });

    var paise = { received: 0, spent: 0, saved: 0 };
    inPeriod.forEach(function (x) {
      paise[x.e.type] += Math.round(x.e.amount * 100);
    });

    // Newest first (same date: the one added last comes first).
    inPeriod.sort(function (a, b) {
      if (a.e.date !== b.e.date) return a.e.date < b.e.date ? 1 : -1;
      return b.i - a.i;
    });

    return {
      received: paise.received / 100,
      spent: paise.spent / 100,
      saved: paise.saved / 100,
      left: (paise.received - paise.spent - paise.saved) / 100,
      entries: inPeriod.map(function (x) {
        return x.e;
      }),
    };
  }

  // ---- entries --------------------------------------------------------------
  function newId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function cleanNote(text) {
    return String(text == null ? "" : text)
      .replace(/[\r\n\t]+/g, " ")
      .trim()
      .slice(0, 100);
  }

  function roundMoney(x) {
    return Math.round(x * 100) / 100;
  }

  // Checks what the form sent. Returns { entry } or { error }.
  function makeEntry(input, now) {
    if (!input || TYPES.indexOf(input.type) === -1) {
      return { error: "Choose Received, Spent or Saved." };
    }
    var amount = roundMoney(Number(input.amount));
    if (!isFinite(amount) || amount <= 0 || amount >= 1e12) {
      return { error: "Enter an amount greater than 0." };
    }
    var date = String(input.date || "");
    if (!isValidDate(date)) date = todayString(now);

    return {
      entry: { id: newId(), type: input.type, amount: amount, date: date, note: cleanNote(input.note) },
    };
  }

  // ---- loading saved / backup data safely -----------------------------------
  function sanitizeState(raw) {
    var out = { startDay: 1, entries: [] };
    if (!raw || typeof raw !== "object") return out;

    var sd = Number(raw.startDay);
    if (Number.isInteger(sd) && sd >= 1 && sd <= 31) out.startDay = sd;

    if (Array.isArray(raw.entries)) {
      var seen = {};
      raw.entries.forEach(function (e) {
        if (!e || TYPES.indexOf(e.type) === -1) return;
        var amount = roundMoney(Number(e.amount));
        if (!isFinite(amount) || amount <= 0 || amount >= 1e12) return;
        if (!isValidDate(e.date)) return;
        var id = typeof e.id === "string" && e.id ? e.id : newId();
        while (seen[id]) id = newId();
        seen[id] = true;
        out.entries.push({ id: id, type: e.type, amount: amount, date: e.date, note: cleanNote(e.note) });
      });
    }
    return out;
  }

  function parseBackup(text) {
    var data;
    try {
      data = JSON.parse(text);
    } catch (err) {
      return { error: "That file is not a Money Tracker backup." };
    }
    if (!data || typeof data !== "object" || !Array.isArray(data.entries)) {
      return { error: "That file is not a Money Tracker backup." };
    }
    return { state: sanitizeState(data) };
  }

  var api = {
    TYPES: TYPES,
    formatDate: formatDate,
    daysInMonth: daysInMonth,
    todayString: todayString,
    isValidDate: isValidDate,
    financialPeriod: financialPeriod,
    summarize: summarize,
    makeEntry: makeEntry,
    sanitizeState: sanitizeState,
    parseBackup: parseBackup,
  };

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.MoneyLogic = api;
})(typeof window !== "undefined" ? window : this);
