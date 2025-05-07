const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = 3001;

app.use(cors());

const MATOMO_API_URL = 'https://analytics.inmapper.com';
const SITE_ID = ''; 
const TOKEN = '7014b00d4bc9cbb906138d9c07d2e12f'; 


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

    const eventActions = ['from->to', 'searched', 'touched'];
    const counts = {
      fromTo: 0,
      searched: 0,
      touched: 0,
      total: 0
    };

    response.data.forEach(item => {
      const label = item.label;
      const count = parseInt(item.nb_events, 10);
      if (eventActions.includes(label)) {
        if (label === 'from->to') counts.fromTo = count;
        if (label === 'searched') counts.searched = count;
        if (label === 'touched') counts.touched = count;
      }
    });

    counts.total = counts.fromTo + counts.searched + counts.touched;

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

    console.log("Touched event name'leri:", response.data);
    res.json(response.data);
  } catch (error) {
    console.error("Touched event name verisi alınırken hata:", error.message);
    res.status(500).json({ error: 'Touched event verisi alınamadı' });
  }
});


app.get('/api/events/daily-count', async (req, res) => {
  try {
    const site = req.query.siteId || SITE_ID;
    let { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      const today = new Date();
      const last7Days = new Date(today);
      last7Days.setDate(today.getDate() - 7);

      startDate = last7Days.toISOString().split('T')[0];
      endDate = today.toISOString().split('T')[0];
    }

    const response = await axios.get(`${MATOMO_API_URL}/index.php`, {
      params: {
        module: 'API',
        method: 'Events.getName',
        idSite: site,
        period: 'day',
        date: `${startDate},${endDate}`,
        format: 'JSON',
        token_auth: TOKEN
      }
    });

    console.log("Matomo API Yanıtı:", response.data);

    if (!response.data || typeof response.data !== 'object') {
      return res.status(500).json({ error: 'Veri işlenemedi, geçersiz yanıt formatı' });
    }

    const dailyCounts = Object.entries(response.data).map(([date, events]) => {
      if (!Array.isArray(events)) {
        return { date, totalEvents: 0 };
      }

      const totalEvents = events.reduce((sum, e) => sum + (parseInt(e.nb_events, 10) || 0), 0);
      return { date, totalEvents };
    });

    res.json(dailyCounts);
  } catch (error) {
    console.error("Günlük işlem sayısı alınırken hata:", error.message);
    res.status(500).json({ error: 'Günlük işlem sayısı verisi alınamadı' });
  }
});


app.get('/api/hourly-visits', async (req, res) => {
  try {
    const site = req.query.siteId || SITE_ID;
    const { startDate, endDate } = req.query;

    const today = new Date().toISOString().split('T')[0];
    const dateRange = startDate && endDate ? { startDate, endDate } : { startDate: today, endDate: today };
    const { startDate: start, endDate: end } = dateRange;

    const dailyVisitsPromises = [];
    const dailyHourlyCounts = [];

    for (let dayOffset = 0; dayOffset < getDaysDifference(start, end); dayOffset++) {
      const currentDate = new Date(start);
      currentDate.setDate(currentDate.getDate() + dayOffset);
      const dateString = currentDate.toISOString().split('T')[0];

      dailyVisitsPromises.push(
        axios.get(`${MATOMO_API_URL}/index.php`, {
          params: {
            module: 'API',
            method: 'Live.getLastVisitsDetails',
            idSite: site,
            period: 'day',
            date: dateString,
            format: 'JSON',
            filter_limit: 1000,
            token_auth: TOKEN
          }
        })
      );
    }

    const dailyVisitsResponses = await Promise.all(dailyVisitsPromises);

    dailyVisitsResponses.forEach((response) => {
      const hourlyCounts = Array(24).fill(0);
      response.data.forEach((visit) => {
        const timestamp = visit.lastActionTimestamp * 1000;
        const hour = new Date(timestamp).getHours();
        hourlyCounts[hour]++;
      });
      dailyHourlyCounts.push(hourlyCounts);
    });

    const hourlySums = Array(24).fill(0);
    dailyHourlyCounts.forEach((dailyCounts) => {
      dailyCounts.forEach((count, hour) => {
        hourlySums[hour] += count;
      });
    });

    const dayCount = dailyHourlyCounts.length;
    const averageHourlyVisits = hourlySums.map(total => total / dayCount);

    res.json({
      success: true,
      startDate: start,
      endDate: end,
      hourlyVisits: averageHourlyVisits
    });

  } catch (error) {
    console.error('Saatlik ziyaret hatası:', error.message);
    res.status(500).json({ success: false, message: 'Veri alınamadı', error: error.message });
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

    const siteList = response.data.map(site => ({
      id: site.idsite,
      name: site.name
    }));

    res.json(siteList);
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




app.listen(PORT, () => {
  console.log(`Sunucu http://localhost:${PORT} adresinde çalışıyor.`);
});
