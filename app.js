// Meira site — shared by / (Hebrew) and /en/ (English).
// The page's language is <html lang>; every string the script writes comes
// from STR[L] or EVENTS[L], so the two pages can never drift apart in logic.
(function () {
  "use strict";

  const L = document.documentElement.lang === "he" ? "he" : "en";

  // ---------- remember an explicit language choice ----------
  // Only a click on the switch is a choice; the auto-detect in the Hebrew
  // page's <head> reads this. Storage can be blocked: the page works without it.
  document.querySelectorAll("[data-lang]").forEach((a) => {
    a.addEventListener("click", () => {
      try { localStorage.setItem("meira.lang", a.dataset.lang); } catch (e) { /* private mode: no memory, still navigates */ }
    });
  });

  // ---------- strings ----------
  const STR = {
    en: {
      min: " min",
      wake: "Wake-up alarm", wakeSmall: (b) => "set on your phone, " + b + " min before you start",
      prepSmall: (m) => m + " min, on the morning itself",
      ready: "Get ready", readySmall: (m) => m + " min, learned from your mornings",
      leave: "Leave home",
      drive: (d, p) => "about " + d + " min at that hour, plus " + p + " to park",
      park: "Park and walk in", spare: (m) => m + " min to spare",
      walk: (w, mode) => w + " min walk to the " + (mode === "train" ? "station" : "stop"),
      arrives: (t, early) => "arrives " + t + ", " + early + " min early",
      mode: { train: "the train", bus: "the bus", car: "the car" },
      fallback: (pref, dep, arr, time, picked) =>
        "You prefer " + pref + ", but the " + dep + " arrives " + arr + ", too late for " + time +
        ". So Meira picked " + picked + " instead, and tells you why.",
      bad: "That email doesn't look right. Check it and try again.",
      preview: "This is a preview link, so sign-up isn't open here.",
      saving: "Saving…",
      ok: "You're in ✓ We'll email you when the Google Play version opens.",
      dup: "You're already on the list ✓",
      notOpen: "Couldn't save: sign-up isn't open yet. Please try again later.",
      err: (s) => "Couldn't save (error " + s + "). Please try again in a minute.",
      net: "Couldn't reach the server. Check your connection and try again."
    },
    he: {
      min: " דק׳",
      wake: "שעון מעורר", wakeSmall: (b) => "מכוון בטלפון, " + b + " דק׳ לפני שמתחילים",
      prepSmall: (m) => m + " דק׳, באותו בוקר",
      ready: "להתארגן", readySmall: (m) => m + " דק׳, נלמד מהבקרים שלכם",
      leave: "לצאת מהבית",
      drive: (d, p) => "בערך " + d + " דק׳ בשעה הזו, ועוד " + p + " לחניה",
      park: "לחנות ולהיכנס", spare: (m) => m + " דק׳ מרווח",
      walk: (w, mode) => w + " דק׳ הליכה " + (mode === "train" ? "לתחנת הרכבת" : "לתחנה"),
      arrives: (t, early) => "מגיע ב-" + t + ", " + early + " דק׳ לפני",
      mode: { train: "רכבת", bus: "אוטובוס", car: "רכב" },
      fallback: (pref, dep, arr, time, picked) =>
        "אתם מעדיפים " + pref + ", אבל היציאה של " + dep + " מגיעה רק ב-" + arr + ", מאוחר מדי ל-" + time +
        ". לכן מאירה בחרה " + picked + ", ואומרת לכם למה.",
      bad: "המייל לא נראה תקין. בדקו ונסו שוב.",
      preview: "זה קישור תצוגה, ההרשמה לא פתוחה כאן.",
      saving: "שומר…",
      ok: "נרשמתם ✓ נשלח לכם מייל כשגרסת Google Play תיפתח.",
      dup: "אתם כבר ברשימה ✓",
      notOpen: "לא נשמר: ההרשמה עוד לא פתוחה. נסו שוב מאוחר יותר.",
      err: (s) => "לא נשמר (שגיאה " + s + "). נסו שוב בעוד דקה.",
      net: "אין חיבור לשרת. בדקו את האינטרנט ונסו שוב."
    }
  }[L];

  // ---------- time helpers ----------
  const toMin = (hhmm) => { const [h, m] = hhmm.split(":").map(Number); return h * 60 + m; };
  const fmt = (min) => { const h = Math.floor(min / 60), m = min % 60; return String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0"); };

  const GET_READY = 45;   // learned, per the "what Meira knows" box
  const WAKE_BUFFER = 8;  // minutes between the alarm and starting to get ready

  // Sample data. Transit options are timetable departures; car is a drive
  // estimate plus parking. `early` is how early she aims to arrive. Times are
  // the same in both languages; only the words differ.
  const WORDS = {
    en: {
      interview: { title: "Job interview", place: "Ra'anana", prep: "Review your notes", train: "Train + bus hop", bus: "Bus 29",
        note: "She'll ask how it went, and plan your review time around the next one." },
      meeting: { title: "Client meeting", place: "Haifa", train: "Train to Haifa", bus: "Intercity bus",
        note: "She looks up the company and the person before you go, and gives you three questions to ask." },
      exam: { title: "Exam", place: "Tel Aviv University", prep: "Last look at your summary", train: "Train to University", bus: "Bus 25",
        note: "Exams get 15 min of margin, not 10, because you need time to find your seat." }
    },
    he: {
      interview: { title: "ראיון עבודה", place: "רעננה", prep: "לעבור על החומר", train: "רכבת + אוטובוס קצר", bus: "קו 29",
        note: "היא תשאל איך היה, ותתכנן את זמן ההכנה סביב הראיון הבא." },
      meeting: { title: "פגישה עם לקוח", place: "חיפה", train: "רכבת לחיפה", bus: "אוטובוס בין־עירוני",
        note: "היא בודקת את החברה ואת האדם לפני שאתם יוצאים, ונותנת לכם שלוש שאלות לשאול." },
      exam: { title: "מבחן", place: "אוניברסיטת תל אביב", prep: "מבט אחרון בסיכום", train: "רכבת לאוניברסיטה", bus: "קו 25",
        note: "למבחנים יש 15 דק׳ מרווח ולא 10, כי צריך זמן למצוא את המקום." }
    }
  }[L];

  const EVENTS = {
    interview: {
      time: "10:00", early: 10, prep: { min: 25 },
      modes: {
        train: [{ dep: "08:32", arr: "10:04", walk: 12 }],
        bus: [{ dep: "08:36", arr: "09:44", walk: 8 }, { dep: "08:51", arr: "09:59", walk: 8 }],
        car: { drive: 55, park: 5 }
      }
    },
    meeting: {
      time: "09:30", early: 10, prep: null,
      modes: {
        train: [{ dep: "07:44", arr: "09:02", walk: 10 }, { dep: "08:14", arr: "09:32", walk: 10 }],
        bus: [{ dep: "07:10", arr: "09:12", walk: 6 }],
        car: { drive: 95, park: 5 }
      }
    },
    exam: {
      time: "09:00", early: 15, prep: { min: 25 },
      modes: {
        train: [{ dep: "08:07", arr: "08:31", walk: 9 }],
        bus: [{ dep: "07:50", arr: "08:24", walk: 5 }, { dep: "08:05", arr: "08:40", walk: 5 }],
        car: { drive: 30, park: 10 }
      }
    }
  };

  // A preference is a ladder, not a constraint: the preferred way first, and
  // the next rung only when the preferred one can't get you there in time.
  const LADDER = { train: ["train", "bus"], bus: ["bus", "train"], car: ["car"] };

  function planTrip(ev, words, pref) {
    const arriveBy = toMin(ev.time) - ev.early;
    let missed = null;
    for (const mode of LADDER[pref]) {
      if (mode === "car") {
        const c = ev.modes.car;
        return { mode, leave: arriveBy - c.drive - c.park, arrive: arriveBy, detail: STR.drive(c.drive, c.park), missed };
      }
      const inTime = ev.modes[mode].filter((o) => toMin(o.arr) <= arriveBy);
      if (inTime.length) {
        const best = inTime.reduce((a, b) => (toMin(b.dep) > toMin(a.dep) ? b : a));
        return { mode, leave: toMin(best.dep) - best.walk, dep: toMin(best.dep), arrive: toMin(best.arr), label: words[mode], walk: best.walk, missed };
      }
      if (!missed) {
        const late = ev.modes[mode].slice().sort((a, b) => toMin(a.arr) - toMin(b.arr))[0];
        missed = { mode, late };
      }
    }
    return null;
  }

  function row(k, time, what, small) {
    const li = document.createElement("li");
    li.className = "step";
    if (k) li.dataset.k = k;
    li.innerHTML = '<span class="t"></span><i class="pin"></i><span class="what"><span class="w"></span><small></small></span>';
    li.querySelector(".t").textContent = time;
    li.querySelector(".w").textContent = what;
    li.querySelector("small").textContent = small;
    return li;
  }

  const $ = (id) => document.getElementById(id);

  function render() {
    const evKey = document.querySelector('input[name="ev"]:checked').value;
    const pref = document.querySelector('input[name="mode"]:checked').value;
    const ev = EVENTS[evKey];
    const words = WORDS[evKey];
    const trip = planTrip(ev, words, pref);
    const chain = $("r-chain");
    chain.textContent = "";

    $("r-title").textContent = words.title;
    $("r-when").textContent = ev.time + " · " + words.place;

    const readyStart = trip.leave - GET_READY;
    const prepStart = ev.prep ? readyStart - ev.prep.min : readyStart;
    const wake = prepStart - WAKE_BUFFER;

    const rows = [row("wake", fmt(wake), STR.wake, STR.wakeSmall(WAKE_BUFFER))];
    if (ev.prep) rows.push(row("", fmt(prepStart), words.prep, STR.prepSmall(ev.prep.min)));
    rows.push(row("", fmt(readyStart), STR.ready, STR.readySmall(GET_READY)));
    if (trip.mode === "car") {
      rows.push(row("leave", fmt(trip.leave), STR.leave, trip.detail));
      rows.push(row("", fmt(trip.arrive), STR.park, STR.spare(ev.early)));
    } else {
      rows.push(row("leave", fmt(trip.leave), STR.leave, STR.walk(trip.walk, trip.mode)));
      rows.push(row("", fmt(trip.dep), trip.label, STR.arrives(fmt(trip.arrive), toMin(ev.time) - trip.arrive)));
    }
    rows.push(row("event", ev.time, words.title, words.place));
    rows.forEach((r) => chain.appendChild(r));

    const fb = $("r-fallback");
    if (trip.missed) {
      $("r-fallback-text").textContent =
        STR.fallback(STR.mode[trip.missed.mode], trip.missed.late.dep, trip.missed.late.arr, ev.time, STR.mode[trip.mode]);
      fb.hidden = false;
    } else {
      fb.hidden = true;
    }
    $("r-note-text").textContent = words.note;

    const res = $("result");
    res.classList.remove("flash"); void res.offsetWidth; res.classList.add("flash");
  }

  if ($("r-chain")) {
    document.querySelectorAll('input[name="ev"], input[name="mode"]').forEach((i) => i.addEventListener("change", render));
    render();
  }

  // ---------- beta sign-up ----------
  // Public by construction: the Supabase anon key ships in every APK too, and
  // RLS on public.waitlist allows INSERT only (supabase/migrations/0012).
  // Success is shown only after the server confirms the write. A failure
  // says it failed and what to do, never a quiet "thanks".
  const cfg = {
    url: "https://ybagugvwqtjtbllgxyin.supabase.co/rest/v1/waitlist",
    key: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InliYWd1Z3Z3cXRqdGJsbGd4eWluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExNzgzNDYsImV4cCI6MjA5Njc1NDM0Nn0.oKT2aQ3B056_Q20ltp2dPWJvMrd9v1p4dOgLFisLCLk"
  };
  const live = /^https:$/.test(location.protocol) || location.hostname === "localhost";
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  function setStatus(el, kind, text) { el.dataset.kind = kind; el.textContent = text; }

  document.querySelectorAll("form.signup").forEach((form) => {
    const input = form.querySelector("input");
    const btn = form.querySelector("button");
    const status = form.querySelector(".signup-status");
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = input.value.trim().toLowerCase();
      if (!EMAIL_RE.test(email)) { setStatus(status, "error", STR.bad); input.focus(); return; }
      if (!live) { setStatus(status, "info", STR.preview); return; }

      btn.disabled = true; const label = btn.textContent; btn.textContent = STR.saving;
      try {
        const res = await fetch(cfg.url, {
          method: "POST",
          headers: { "Content-Type": "application/json", apikey: cfg.key, Authorization: "Bearer " + cfg.key, Prefer: "return=minimal" },
          body: JSON.stringify({ email, source: (form.dataset.source || "site") + "-" + L })
        });
        if (res.ok) { setStatus(status, "ok", STR.ok); form.reset(); }
        else if (res.status === 409) { setStatus(status, "ok", STR.dup); }
        else {
          const body = await res.text().catch(() => "");
          console.warn("[waitlist] insert failed", res.status, body.slice(0, 300));
          setStatus(status, "error", res.status === 404 ? STR.notOpen : STR.err(res.status));
        }
      } catch (err) {
        console.warn("[waitlist] network error", err);
        setStatus(status, "error", STR.net);
      } finally {
        btn.disabled = false; btn.textContent = label;
      }
    });
  });
})();
