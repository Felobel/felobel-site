// Cette fonction tourne côté serveur, jamais dans le navigateur du visiteur.
// Le jeton Airtable (AIRTABLE_TOKEN) est stocké comme variable d'environnement
// dans Netlify, jamais écrit ici en clair, jamais visible dans le code du site.

const BASE_ID = 'appdFTFadBkfuhVxM';
const TABLE_ID = 'tblm2tc633ZVuL7yG';

exports.handler = async function () {
  const token = process.env.AIRTABLE_TOKEN;

  if (!token) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'AIRTABLE_TOKEN manquant côté serveur (variable d\'environnement Netlify).' }),
    };
  }

  try {
    // On ne récupère que les livrables cochés "Publié", triés par date de création décroissante
    const url = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}?filterByFormula=${encodeURIComponent('{Publié}=1')}`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const errText = await res.text();
      return { statusCode: res.status, body: JSON.stringify({ error: 'Erreur Airtable', detail: errText }) };
    }

    const data = await res.json();

    const records = (data.records || []).map((r) => {
      const f = r.fields || {};
      const attachment = Array.isArray(f['Fichier']) && f['Fichier'].length > 0 ? f['Fichier'][0] : null;
      const cover = Array.isArray(f['Image de couverture']) && f['Image de couverture'].length > 0 ? f['Image de couverture'][0] : null;

      return {
        id: r.id,
        titre: f['Titre'] || '',
        type: f['Type'] || '',
        programme: f['Programme'] || '',
        description: f['Description'] || '',
        date: f['Date'] || '',
        // URL directe du fichier joint (PDF, vidéo, image), si présent
        fichierUrl: attachment ? attachment.url : null,
        fichierNomType: attachment ? attachment.type : null, // ex: "application/pdf"
        // Image de couverture pour la vignette de la galerie (indépendante du fichier)
        imageUrl: cover ? cover.url : null,
        // Lien externe (YouTube/Vimeo/autre), utilisé si pas de fichier joint
        lienExterne: f['Lien externe'] || null,
        // Mise en avant sur la page d'accueil
        surAccueil: !!f["Sur la page d'accueil"],
      };
    });

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=180', // 3 min de cache, pour ne pas surcharger Airtable
      },
      body: JSON.stringify({ records }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Erreur lors du chargement des livrables', detail: String(err) }),
    };
  }
};
