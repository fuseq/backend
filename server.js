const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
// CapRover sets PORT env variable automatically
const PORT = process.env.PORT || 3000;

// CORS configuration for CapRover deployment
const allowedOrigins = [
  'https://matomo-analytics-frontend.socket.com',
  'http://matomo-analytics-frontend.socket.com',
  'http://localhost:5500', // Local development
  'http://localhost:8080', // Local development
  'http://127.0.0.1:5500'  // Local development
];

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('Blocked origin:', origin);
      callback(null, true); // Still allow for now, change to false in production
    }
  },
  credentials: true
}));

const MATOMO_API_URL = 'https://analytics.inmapper.com';
const SITE_ID = '';
const TOKEN = '7014b00d4bc9cbb906138d9c07d2e12f';

// Site Kategorileri ve Metadata
const SITE_CATEGORIES = {
  avm: {
    name: 'AVM',
    icon: '🛍️',
    color: '#FF6B6B',
    sites: [16, 26, 195, 15, 50, 178, 8, 91, 199, 190]
  },
  havalimani: {
    name: 'Havalimanı',
    icon: '✈️',
    color: '#4ECDC4',
    sites: [37, 32, 30, 172, 173, 174, 175, 83, 42, 100, 58]
  },
  magaza: {
    name: 'Mağaza',
    icon: '👔',
    color: '#9B59B6',
    sites: [157, 158, 159, 160, 161, 162, 163, 198]
  },
  fuar: {
    name: 'Fuar',
    icon: '🎪',
    color: '#F39C12',
    sites: [191, 192, 196]
  },
  egitim: {
    name: 'Eğitim/Kampüs',
    icon: '🎓',
    color: '#3498DB',
    sites: [193, 194]
  },
  kamu: {
    name: 'Kamu/Belediye',
    icon: '🏛️',
    color: '#1ABC9C',
    sites: [94]
  },
  diger: {
    name: 'Diğer',
    icon: '📍',
    color: '#95A5A6',
    sites: [2, 183, 190]
  }
};

// Site ID'den kategori bilgisi al
function getSiteCategory(siteId) {
  const id = parseInt(siteId);
  for (const [key, category] of Object.entries(SITE_CATEGORIES)) {
    if (category.sites.includes(id)) {
      return { key, ...category };
    }
  }
  return { key: 'diger', ...SITE_CATEGORIES.diger };
}


function getDateParam(req) {
  const { startDate, endDate } = req.query;
  if (startDate && endDate) {
    return `${startDate},${endDate}`;
  }
  return 'last7';
}



app.get('/api/events/from-to-names', async (req, res) => {
  try {

    const { siteId, startDate, endDate } = req.query;


    const site = siteId || SITE_ID;


    const date = startDate && endDate ? `${startDate},${endDate}` : 'last7';

    const response = await axios.get(`${MATOMO_API_URL}/index.php`, {
      params: {
        module: 'API',
        method: 'Events.getName',
        idSite: site,
        period: 'range',
        date,
        format: 'JSON',
        token_auth: TOKEN,
        segment: 'eventAction==from-%3Eto'
      }
    });

    console.log("from->to event names:", response.data);
    res.json(response.data);
  } catch (error) {
    console.error("from->to event name hatası:", error.message);
    res.status(500).json({ error: 'from->to event name verisi alınamadı' });
  }
});

app.get('/api/events/summary-counts', async (req, res) => {
  try {
    const { siteId, startDate, endDate } = req.query;
    const site = siteId || SITE_ID;
    const date = startDate && endDate ? `${startDate},${endDate}` : 'last7';

    const response = await axios.get(`${MATOMO_API_URL}/index.php`, {
      params: {
        module: 'API',
        method: 'Events.getAction',
        idSite: site,
        period: 'range',
        date,
        format: 'JSON',
        token_auth: TOKEN
      }
    });

    const counts = {
      fromTo: 0,
      searched: 0,
      touched: 0,
      initialized: 0,
      total: 0
    };

    response.data.forEach(item => {
      const label = item.label;
      const count = parseInt(item.nb_events, 10);
      if (label === 'from->to') counts.fromTo = count;
      if (label === 'searched') counts.searched = count;
      if (label === 'touched') counts.touched += count;
      if (label === 'initialized') counts.initialized += count;
    });

    counts.total = counts.fromTo + counts.searched + counts.touched + counts.initialized;

    res.json(counts);
  } catch (error) {
    console.error("Event summary error:", error.message);
    res.status(500).json({ error: 'Event summary verisi alınamadı' });
  }
});



app.get('/api/user-statistics', async (req, res) => {
  try {
    const site = req.query.siteId || SITE_ID;
    const date = getDateParam(req);

    const visitsResponse = await axios.get(`${MATOMO_API_URL}/index.php`, {
      params: {
        module: 'API',
        method: 'VisitsSummary.get',
        idSite: site,
        period: 'range',
        date,
        format: 'JSON',
        token_auth: TOKEN
      }
    });


    const bounceRate = visitsResponse.data.bounce_rate;

    const deviceResponse = await axios.get(`${MATOMO_API_URL}/index.php`, {
      params: {
        module: 'API',
        method: 'DevicesDetection.getType',
        idSite: site,
        period: 'range',
        date,
        format: 'JSON',
        token_auth: TOKEN
      }
    });

    const totalVisits = visitsResponse.data.nb_visits;
    const avgTimeOnPage = visitsResponse.data.avg_time_on_site;

    const deviceTypeData = deviceResponse.data;
    const deviceTypes = deviceTypeData.reduce((acc, item) => {
      acc[item.label] = item.nb_visits;
      return acc;
    }, {});
    const mostVisitedDeviceType = Object.keys(deviceTypes).reduce((a, b) =>
      deviceTypes[a] > deviceTypes[b] ? a : b
    );

    res.json({
      totalVisits,
      bounceRate,
      mostVisitedDeviceType,
      avgTimeOnPage
    });
  } catch (error) {
    console.error('Kullanıcı istatistikleri hatası:', error.message);
    res.status(500).json({ error: 'Veri alınamadı' });
  }
});



app.get('/api/events/searched', async (req, res) => {
  try {
    const site = req.query.siteId || SITE_ID;
    const date = getDateParam(req);

    const response = await axios.get(`${MATOMO_API_URL}/index.php`, {
      params: {
        module: 'API',
        method: 'Events.getName',
        idSite: site,
        period: 'range',
        date,
        format: 'JSON',
        token_auth: TOKEN,
        segment: 'eventAction==searched'
      }
    });

    console.log("Searched event name'leri:", response.data);
    res.json(response.data);
  } catch (error) {
    console.error("Searched event name verisi alınırken hata:", error.message);
    res.status(500).json({ error: 'Searched event verisi alınamadı' });
  }
});

app.get('/api/events/searched-daily', async (req, res) => {
  try {
    const site = req.query.siteId || SITE_ID;
    const date = getDateParam(req);
    const period = 'day';

    const response = await axios.get(`${MATOMO_API_URL}/index.php`, {
      params: {
        module: 'API',
        method: 'Events.getName',
        idSite: site,
        period,
        date,
        format: 'JSON',
        token_auth: TOKEN,
        segment: 'eventAction==searched'
      }
    });

    const data = response.data;


    const dailyResults = {};

    for (const [day, events] of Object.entries(data)) {

      const dailyAggregates = {};

      events.forEach(event => {
        const labelKey = event.label.split('>')[1] || event.label;
        if (!dailyAggregates[labelKey]) {
          dailyAggregates[labelKey] = {
            label: labelKey,
            total_nb_events: 0
          };
        }

        dailyAggregates[labelKey].total_nb_events += event.nb_events;
      });


      dailyResults[day] = Object.values(dailyAggregates);
    }

    res.json(dailyResults);
  } catch (error) {
    console.error("Searched event name verisi alınırken hata:", error.message);
    res.status(500).json({ error: 'Searched event verisi alınamadı' });
  }
});



app.get('/api/events/touched', async (req, res) => {
  try {
    const site = req.query.siteId || SITE_ID;
    const date = getDateParam(req);

    const response = await axios.get(`${MATOMO_API_URL}/index.php`, {
      params: {
        module: 'API',
        method: 'Events.getName',
        idSite: site,
        period: 'range',
        date,
        format: 'JSON',
        token_auth: TOKEN,
        segment: 'eventAction==touched'
      }
    });

    // Dönüştürülmüş veri
    const mappedData = {};
    response.data.forEach(item => {
      mappedData[item.label] = item.nb_visits;
    });

    console.log("Touched event name verisi (dönüştürülmüş):", mappedData);
    res.json(mappedData);
  } catch (error) {
    console.error("Touched event name verisi alınırken hata:", error.message);
    res.status(500).json({ error: 'Touched event verisi alınamadı' });
  }
});

app.get('/api/events/initialized', async (req, res) => {
  try {
    const site = req.query.siteId || SITE_ID;
    const date = getDateParam(req);

    const response = await axios.get(`${MATOMO_API_URL}/index.php`, {
      params: {
        module: 'API',
        method: 'Events.getName',
        idSite: site,
        period: 'range',
        date,
        format: 'JSON',
        token_auth: TOKEN,
        segment: 'eventAction==initialized'
      }
    });

    const data = response.data;

    // Verinin geçerliliğini kontrol et
    if (!Array.isArray(data)) {
      console.error("Beklenmeyen veri formatı:", data);
      return res.status(500).json({ error: 'Geçersiz veri formatı' });
    }

    // Hariç tutulacak başlıklar
    const excludedTitles = ["web", "mobile-iOS", "mobile-Android"];

    // Dönüştürme: { [label]: nb_visits } formatı
    const mappedData = {};
    data.forEach(item => {
      if (
        item.label &&
        typeof item.nb_visits !== 'undefined' &&
        !excludedTitles.includes(item.label)
      ) {
        mappedData[item.label] = item.nb_visits;
      } else {
        console.warn("Eksik, hatalı veya dışlanmış öğe atlandı:", item);
      }
    });

    console.log("Initialized event name verisi (filtrelenmiş):", mappedData);
    res.json(mappedData);
  } catch (error) {
    console.error("Initialized event verisi alınırken hata:", error.message);
    res.status(500).json({ error: 'Initialized event verisi alınamadı' });
  }
});


app.get('/api/events/daily-count', async (req, res) => { // Endpoint adını daha açıklayıcı yaptım: actions
  try {
    console.log("Gelen sorgu parametreleri (req.query):", JSON.stringify(req.query, null, 2));

    const site = req.query.siteId || SITE_ID;
    let startDate = req.query.startDate;
    let endDate = req.query.endDate;
    const dateRangeQuery = req.query.date;

    if (dateRangeQuery && !startDate && !endDate) {
      const dates = dateRangeQuery.split(',');
      if (dates.length === 2 && dates[0].match(/^\d{4}-\d{2}-\d{2}$/) && dates[1].match(/^\d{4}-\d{2}-\d{2}$/)) {
        startDate = dates[0];
        endDate = dates[1];
      }
    }

    if (!startDate || !endDate) {
      const today = new Date();
      const last7Days = new Date(today);
      last7Days.setDate(today.getDate() - 7);
      startDate = last7Days.toISOString().split('T')[0];
      endDate = today.toISOString().split('T')[0];
      console.log(`Varsayılan tarihler ayarlandı - startDate: ${startDate}, endDate: ${endDate}`);
    }



    const matomoParams = {
      module: 'API',

      method: 'VisitsSummary.getActions',
      idSite: site,
      period: 'day',
      date: `${startDate},${endDate}`,
      format: 'JSON',
      token_auth: TOKEN
    };
    console.log("Matomo API'sine gönderilecek parametreler:", matomoParams);

    const response = await axios.get(`${MATOMO_API_URL}/index.php`, {
      params: matomoParams
    });

    console.log("Matomo API Yanıtı (response.data):", JSON.stringify(response.data, null, 2));

    if (!response.data || typeof response.data !== 'object') {
      return res.status(500).json({ error: 'Veri işlenemedi, geçersiz yanıt formatı' });
    }

    const dailyCounts = Object.entries(response.data).map(([date, totalActions]) => {
      return {
        date,
        totalEvents: totalActions || 0 
      };
    });



    res.json(dailyCounts);
  } catch (error) {
    console.error("Günlük işlem sayısı alınırken hata:", error.message);
    if (error.isAxiosError) {
      console.error("Axios Hata Detayları:", error.response ? error.response.data : "Yanıt yok");
    }
    res.status(500).json({ error: 'Günlük işlem sayısı verisi alınamadı' });
  }
});


app.get('/api/hourly-visits', async (req, res) => {
  try {
    const site = req.query.siteId || SITE_ID;
    const { startDate, endDate } = req.query;

    const today = new Date().toISOString().split('T')[0];
    const dateRange = startDate && endDate
      ? { startDate, endDate }
      : { startDate: today, endDate: today };

    const { startDate: start, endDate: end } = dateRange;

    const response = await axios.get(`${MATOMO_API_URL}/index.php`, {
      params: {
        module: 'API',
        method: 'VisitTime.getVisitInformationPerServerTime',
        idSite: site,
        period: 'range',
        date: `${start},${end}`,
        format: 'JSON',
        token_auth: TOKEN
      }
    });

    const data = response.data;

    // 0'dan 23'e kadar saatleri kapsayan dizi oluştur
    const hourlySums = Array(24).fill(0);
    data.forEach(item => {
      const hour = parseInt(item.label);         // Saat (label: "0" - "23")
      const count = parseInt(item.nb_visits);    // Ziyaret sayısı
      if (!isNaN(hour) && hour >= 0 && hour <= 23) {
        hourlySums[hour] = count;
      }
    });

    res.json({
      success: true,
      startDate: start,
      endDate: end,
      hourlyVisits: hourlySums
    });

  } catch (error) {
    console.error('Saatlik ziyaret hatası:', error.message);
    res.status(500).json({
      success: false,
      message: 'Veri alınamadı',
      error: error.message
    });
  }
});

// Yardımcı fonksiyon
function getDaysDifference(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
}

app.get('/api/sites', async (req, res) => {
  try {
    const response = await axios.get(`${MATOMO_API_URL}/index.php`, {
      params: {
        module: 'API',
        method: 'SitesManager.getSitesWithAtLeastViewAccess',
        format: 'JSON',
        token_auth: TOKEN
      }
    });

    const siteList = response.data.map(site => {
      const category = getSiteCategory(site.idsite);
      return {
        id: site.idsite,
        name: site.name,
        url: site.main_url,
        category: category.key,
        categoryName: category.name,
        categoryIcon: category.icon,
        categoryColor: category.color
      };
    });

    // Kategorilere göre grupla
    const grouped = {};
    Object.entries(SITE_CATEGORIES).forEach(([key, cat]) => {
      grouped[key] = {
        name: cat.name,
        icon: cat.icon,
        color: cat.color,
        sites: siteList.filter(s => s.category === key)
      };
    });

    res.json({
      sites: siteList,
      categories: SITE_CATEGORIES,
      grouped: grouped
    });
  } catch (error) {
    console.error("Site listesi alınırken hata:", error.message);
    res.status(500).json({ error: 'Site listesi alınamadı' });
  }
});

app.get('/api/export-unique-visitors', async (req, res) => {
  try {
    const site = req.query.siteId || SITE_ID;
    const date = getDateParam(req);

    const response = await axios.get(`${MATOMO_API_URL}/index.php`, {
      params: {
        module: 'API',
        method: 'VisitsSummary.get',
        idSite: site,
        period: 'range',
        date,
        format: 'JSON',
        token_auth: TOKEN
      }
    });

    res.json(response.data);
  } catch (error) {
    console.error('Benzersiz ziyaretçi verisi dışa aktarılırken hata:', error.message);
    res.status(500).json({ error: 'Benzersiz ziyaretçi verisi dışa aktarılamadı' });
  }
});

app.get('/api/os-distribution', async (req, res) => {
  try {
    const site = req.query.siteId || SITE_ID;
    const date = getDateParam(req);

    const response = await axios.get(`${MATOMO_API_URL}/index.php`, {
      params: {
        module: 'API',
        method: 'DevicesDetection.getOsFamilies', // Alternatif: getOsVersions
        idSite: site,
        period: 'range',
        date,
        format: 'JSON',
        token_auth: TOKEN
      }
    });

    const osData = response.data.map(item => ({
      osFamily: item.label,
      visits: item.nb_visits
    }));

    res.json(osData);
  } catch (error) {
    console.error('İşletim sistemi dağılımı alınırken hata:', error.message);
    res.status(500).json({ error: 'İşletim sistemi dağılımı verisi alınamadı' });
  }
});

app.get('/api/user-language-distribution', async (req, res) => {
  try {
    const site = req.query.siteId || SITE_ID;
    const date = getDateParam(req);


    const response = await axios.get(`${MATOMO_API_URL}/index.php`, {
      params: {
        module: 'API',
        method: 'UserLanguage.getLanguageCode',
        idSite: site,
        period: 'range',
        date,
        format: 'JSON',
        token_auth: TOKEN
      }
    });


    const languageDistribution = {};


    response.data.forEach(item => {
      const languageCode = item.label;
      const visits = item.nb_visits;

      if (languageDistribution[languageCode]) {
        languageDistribution[languageCode] += visits;
      } else {
        languageDistribution[languageCode] = visits;
      }
    });


    res.json(languageDistribution);
  } catch (error) {
    console.error("Dil verisi alınırken hata:", error.message);
    res.status(500).json({ error: 'Dil verisi alınamadı' });
  }
});

app.get('/api/campaigns', async (req, res) => {
  try {
    const { siteId, startDate, endDate } = req.query;

    if (!siteId) {
      return res.status(400).json({ error: 'siteId parametresi gerekli' });
    }

    const start = startDate || getDateNDaysAgo(7);
    const end = endDate || getTodayDate();
    const date = `${start},${end}`;

    const response = await axios.get(`${MATOMO_API_URL}/index.php`, {
      params: {
        module: 'API',
        method: 'Referrers.getCampaigns',
        idSite: siteId,
        period: 'range',
        date,
        format: 'JSON',
        token_auth: TOKEN
      }
    });

    console.log("Kampanya verileri:", response.data);
    res.json(response.data);
  } catch (error) {
    console.error("Kampanya verisi alınırken hata:", error.message);
    res.status(500).json({ error: 'Kampanya verisi alınamadı' });
  }
});

// Health check endpoint for CapRover
app.get('/', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    service: 'Matomo Analytics Backend',
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

app.listen(PORT, () => {
  console.log(`Sunucu http://localhost:${PORT} adresinde çalışıyor.`);
});
