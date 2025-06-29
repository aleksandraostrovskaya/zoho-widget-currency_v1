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
  } catch (error) {
    document.getElementById('log').textContent = error.message;
    console.error(error);
  }
});

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
  } catch (err) {
    alert('Помилка при оновленні!');
    console.error(err);
  } finally {
    btn.disabled = false;
    btn.textContent = originalText;
  }
});

ZOHO.embeddedApp.init();
