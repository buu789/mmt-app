// app.js
// ---------------------------------------------------------------------------
// The screen: buttons, lists and saving on the phone. The maths is in logic.js.
// ---------------------------------------------------------------------------
(function () {
  "use strict";

  var L = window.MoneyLogic;
  var KEY = "moneyTracker.v1"; // where the data is saved inside the phone's browser storage
  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  function $(id) {
    return document.getElementById(id);
  }

  var state = loadState();
  var offset = 0; // 0 = this financial month, -1 = last month, ...
  var type = "received";
  var dateTouched = false;

  // ---- saving and loading ---------------------------------------------------
  function loadState() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) return L.sanitizeState(JSON.parse(raw));
    } catch (err) {
      /* fall through to an empty state */
    }
    return L.sanitizeState(null);
  }

  function saveState() {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
      return true;
    } catch (err) {
      showMsg("Could not save on this phone (storage is full or blocked).");
      return false;
    }
  }

  // ---- small helpers --------------------------------------------------------
  function fmt(n) {
    return "₹" + Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function prettyDate(s) {
    var p = s.split("-");
    return p[2] + " " + MONTHS[Number(p[1]) - 1] + " " + p[0];
  }

  function showMsg(text) {
    $("msg").textContent = text || "";
  }

  // ---- drawing the screen ---------------------------------------------------
  function render() {
    var period = L.financialPeriod(state.startDay, offset);
    var sum = L.summarize(state.entries, period);

    $("periodName").textContent = offset === 0 ? "This month" : offset === -1 ? "Last month" : -offset + " months ago";
    $("periodDates").textContent = prettyDate(period.start) + " – " + prettyDate(period.end);
    $("next").disabled = offset >= 0;

    $("tReceived").textContent = fmt(sum.received);
    $("tSpent").textContent = fmt(sum.spent);
    $("tSaved").textContent = fmt(sum.saved);
    $("tLeft").textContent = fmt(sum.left);
    $("tLeft").className = sum.left < 0 ? "red" : "green";

    if (!dateTouched) $("date").value = L.todayString();
    $("startDay").value = String(state.startDay);

    var list = $("list");
    list.innerHTML = "";
    if (sum.entries.length === 0) {
      var empty = document.createElement("div");
      empty.className = "empty";
      empty.textContent = "Nothing here yet.";
      list.appendChild(empty);
    }

    sum.entries.forEach(function (e) {
      var row = document.createElement("div");
      row.className = "entry";

      var info = document.createElement("div");
      info.className = "info";
      var title = document.createElement("div");
      title.textContent = e.note || e.type.charAt(0).toUpperCase() + e.type.slice(1);
      var sub = document.createElement("small");
      sub.textContent = prettyDate(e.date) + " · " + e.type;
      info.appendChild(title);
      info.appendChild(sub);

      var amt = document.createElement("strong");
      amt.className = e.type === "received" ? "green" : e.type === "spent" ? "red" : "blue";
      amt.textContent = (e.type === "received" ? "+" : "−") + fmt(e.amount);

      var del = document.createElement("button");
      del.className = "del";
      del.textContent = "✕";
      del.setAttribute("aria-label", "Delete entry");
      del.onclick = function () {
        if (!confirm("Delete this entry?")) return;
        state.entries = state.entries.filter(function (x) {
          return x.id !== e.id;
        });
        saveState();
        render();
      };

      row.appendChild(info);
      row.appendChild(amt);
      row.appendChild(del);
      list.appendChild(row);
    });
  }

  // ---- buttons --------------------------------------------------------------
  var typeButtons = document.querySelectorAll(".types button");
  Array.prototype.forEach.call(typeButtons, function (b) {
    b.onclick = function () {
      type = b.getAttribute("data-type");
      Array.prototype.forEach.call(typeButtons, function (x) {
        x.classList.toggle("active", x === b);
      });
    };
  });

  $("add").onclick = function () {
    showMsg("");
    var result = L.makeEntry({
      type: type,
      amount: $("amount").value,
      note: $("note").value,
      date: $("date").value,
    });
    if (result.error) {
      showMsg(result.error);
      return;
    }
    state.entries.push(result.entry);
    if (saveState()) {
      $("amount").value = "";
      $("note").value = "";
      dateTouched = false;
    }
    render();
  };

  $("date").onchange = function () {
    dateTouched = true;
  };

  $("prev").onclick = function () {
    offset--;
    render();
  };
  $("next").onclick = function () {
    if (offset < 0) {
      offset++;
      render();
    }
  };

  for (var d = 1; d <= 31; d++) {
    var o = document.createElement("option");
    o.value = String(d);
    o.textContent = String(d);
    $("startDay").appendChild(o);
  }
  $("saveDay").onclick = function () {
    showMsg("");
    state.startDay = Number($("startDay").value);
    offset = 0;
    saveState();
    render();
  };

  // ---- backup and restore ---------------------------------------------------
  $("backup").onclick = function () {
    var blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "money-tracker-backup-" + L.todayString() + ".json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () {
      URL.revokeObjectURL(url);
    }, 2000);
  };

  $("restore").onclick = function () {
    $("restoreFile").click();
  };

  $("restoreFile").onchange = function () {
    var file = this.files && this.files[0];
    var input = this;
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      var result = L.parseBackup(String(reader.result));
      if (result.error) {
        showMsg(result.error);
      } else if (confirm("Replace everything on this phone with the backup (" + result.state.entries.length + " entries)?")) {
        state = result.state;
        offset = 0;
        saveState();
        render();
        showMsg("");
      }
      input.value = ""; // allows choosing the same file again later
    };
    reader.readAsText(file);
  };

  // ---- start up -------------------------------------------------------------
  // Ask the browser to keep our data even when the phone is low on space.
  if (navigator.storage && navigator.storage.persist) {
    navigator.storage.persist().catch(function () {});
  }

  // Refresh the date and totals whenever the app is opened again.
  document.addEventListener("visibilitychange", function () {
    if (!document.hidden) render();
  });

  // Makes the app work offline and installable.
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("sw.js").catch(function () {});
    });
  }

  render();
})();
