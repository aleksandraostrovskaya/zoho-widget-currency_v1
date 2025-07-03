let currentLang = 'ua';
let i18n = {};
const NBU_RATE_KEY = 'last_nbu_rate';

async function loadTranslations(lang) {
  try {
    const res = await fetch('lang.json');
    const translations = await res.json();
    const dict = translations[lang];
    if (!dict) {
      console.warn(`Translations for language "${lang}" not found.`);
      return;
    }

    i18n = dict;

    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (dict[key]) {
        el.textContent = dict[key];
      }
    });
  } catch (err) {
    console.error('Translation load error:', err);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  currentLang = localStorage.getItem('lang') || 'ua';
  loadTranslations(currentLang);

  const langSelect = document.getElementById('lang-select');
  if (langSelect) {
    langSelect.value = currentLang;
    langSelect.addEventListener('change', e => {
      currentLang = e.target.value;
      localStorage.setItem('lang', currentLang);
      loadTranslations(currentLang);
    });
  }
});

let dealId = null;
let currentNbuRate = null;

ZOHO.embeddedApp.on('PageLoad', async function (data) {
  dealId = data?.EntityId;
  if (!dealId) {
    document.getElementById('log').textContent = 'Не знайдено ID угоди.';
    return;
  }
  const savedRate = localStorage.getItem(NBU_RATE_KEY);
  if (savedRate) {
    document.getElementById('nbu-rate').textContent = savedRate;
    console.log(`[LOG] Встановлено збережений курс НБУ: ${savedRate}`);
  }

  try {
    const res = await fetch(
      'https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?valcode=USD&json'
    );
    if (!res.ok) throw new Error('Не вдалося отримати курс НБУ');
    const nbuData = await res.json();
    currentNbuRate = nbuData[0].rate;
    localStorage.setItem(NBU_RATE_KEY, currentNbuRate);

    console.log(`[LOG] Отримано курс НБУ: ${currentNbuRate}`);
    document.getElementById('nbu-rate').textContent = currentNbuRate;

    const response = await ZOHO.CRM.API.getRecord({
      Entity: 'Deals',
      RecordID: dealId,
    });
    const dealRate = parseFloat(response.data?.[0]?.Currency_Rate || 0);
    document.getElementById('deal-rate').textContent = dealRate;

    const diff = ((dealRate / currentNbuRate - 1) * 100).toFixed(1);
    document.getElementById('diff').textContent = diff + '%';

    if (Math.abs(diff) >= 5) {
      const btn = document.getElementById('update-btn');
      btn.style.display = 'inline-block';
      btn.disabled = false;
    } else {
      document.getElementById('update-btn').style.display = 'none';
    }
    await loadHistoryTable();
  } catch (error) {
    document.getElementById('log').textContent = error.message;
    console.error(error);
  }
});

async function createRateHistoryRecord(dealRate, currentRate) {
  const difference = ((dealRate / currentRate - 1) * 100).toFixed(1);

  try {
    const now = new Date().toISOString();

    const response = await ZOHO.CRM.API.insertRecord({
      Entity: 'Exchange_Rate_History',
      APIData: {
        Deal: dealId,
        Rate: currentNbuRate,
        Date: now,
        Rate_Source: 'НБУ',
        Difference: difference,
      },
      Trigger: [],
    });

    console.log(`[LOG] Запис історії створено: ${response.data}`);
  } catch (err) {
    console.error('Помилка при створенні історії:', err);
  }
}

document.getElementById('update-btn').addEventListener('click', async () => {
  if (!dealId || currentNbuRate === null) return;
  console.log('[LOG] Натиснуто кнопку "Записати курс в Угоду"');

  const btn = document.getElementById('update-btn');
  btn.disabled = true;
  const originalText = btn.textContent;
  btn.textContent = i18n.updating || 'Оновлення...';

  try {
    await ZOHO.CRM.API.updateRecord({
      Entity: 'Deals',
      APIData: {
        id: dealId,
        Currency_Rate: currentNbuRate,
      },
    });
    console.log(`[LOG] Курс оновлено в Угоді: ${currentNbuRate}`);

    await createRateHistoryRecord(currentNbuRate, currentNbuRate);
    await loadHistoryTable();
  } catch (err) {
    alert('Помилка при оновленні!');
    console.error(err);
  } finally {
    btn.disabled = false;
    btn.textContent = originalText;
  }
});

async function loadHistoryTable() {
  try {
    const response = await ZOHO.CRM.API.searchRecords({
      Entity: 'Exchange_Rate_History',
      Criteria: `(Deal:equals:${dealId})`,
      sort_by: 'Date',
      sort_order: 'desc',
      page: 1,
      per_page: 5,
    });

    const historyList = response.data || [];

    const tbody = document.getElementById('history-body');
    tbody.innerHTML = '';

    for (let record of historyList) {
      const date = new Date(record.Date);
      const formattedDate = date.toLocaleString('uk-UA', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${formattedDate}</td>
        <td>${record.Rate}</td>
        <td>${record[Difference]}%</td>
      `;
      tbody.appendChild(tr);
    }

    console.log('[LOG] Історію завантажено');
  } catch (err) {
    console.error('Помилка при завантаженні історії:', err);
  }
}

ZOHO.embeddedApp.init();
