let currentLang = 'ua';

async function loadTranslations(lang) {
  try {
    const res = await fetch('lang.json');
    const translations = await res.json();
    const dict = translations[lang];
    if (!dict) {
      console.warn(`Translations for language "${lang}" not found.`);
      return;
    }

    document.querySelectorAll('[data-i18n]').forEach((el) => {
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
    langSelect.addEventListener('change', (e) => {
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

  try {
    const res = await fetch(
      'https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?valcode=USD&json'
    );
    if (!res.ok) throw new Error('Не вдалося отримати курс НБУ');
    const nbuData = await res.json();
    currentNbuRate = nbuData[0].rate;
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

  const btn = document.getElementById('update-btn');
  btn.disabled = true;

  try {
    await ZOHO.CRM.API.updateRecord({
      Entity: 'Deals',
      APIData: {
        id: dealId,
        Currency_Rate: currentNbuRate,
      },
    });
    alert('Курс оновлено!');
  } catch (err) {
    alert('Помилка при оновленні!');
    console.error(err);
  } finally {
    btn.disabled = false;
  }
});

ZOHO.embeddedApp.init();
