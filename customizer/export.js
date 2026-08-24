// customizer/export.js — Code complet et corrigé

document.addEventListener('DOMContentLoaded', () => {
  const exportBtn = document.getElementById('btn-export');
  if (exportBtn) {
    exportBtn.addEventListener('click', exportSiteZip);
  }
});

/**
 * Exporte l'intégralité du site et la configuration actuelle dans une archive ZIP
 */
async function exportSiteZip() {
  const exportBtn = document.getElementById('btn-export');
  const originalText = exportBtn ? exportBtn.textContent : 'Exporter (ZIP)';

  try {
    if (exportBtn) {
      exportBtn.disabled = true;
      exportBtn.textContent = 'Génération du ZIP...';
    }

    if (typeof JSZip === 'undefined' || typeof saveAs === 'undefined') {
      throw new Error('Les librairies JSZip ou FileSaver ne sont pas chargées.');
    }

    const zip = new JSZip();

    // 1. Récupération de la configuration actuelle
    const liveConfigStr = localStorage.getItem('site_config_live');
    const configData = liveConfigStr 
      ? JSON.parse(liveConfigStr) 
      : (typeof currentConfig !== 'undefined' ? currentConfig : {});

    // Ajout du fichier site-config.json à la racine du ZIP
    zip.file('site-config.json', JSON.stringify(configData, null, 2));

    // 2. Fichiers à récupérer à la racine (chemin relatif ../ depuis le dossier customizer/)
    const filesToFetch = [
      { path: '../index.html', zipPath: 'index.html' },
      { path: '../config-loader.js', zipPath: 'config-loader.js' }
    ];

    // Téléchargement et ajout des fichiers dans le ZIP
    for (const file of filesToFetch) {
      try {
        const res = await fetch(file.path);
        if (res.ok) {
          const content = await res.text();
          zip.file(file.zipPath, content);
        } else {
          console.warn(`Fichier non trouvé lors de l'export : ${file.path}`);
        }
      } catch (err) {
        console.warn(`Erreur lors du chargement de ${file.path} :`, err);
      }
    }

    // 3. Génération et téléchargement de l'archive
    const blob = await zip.generateAsync({ type: 'blob' });
    
    const slugName = (configData.site && configData.site.name)
      ? configData.site.name.toLowerCase().trim().replace(/[^a-z0-9]/g, '-')
      : 'site';

    saveAs(blob, `${slugName}-export.zip`);

  } catch (error) {
    console.error('Erreur lors de l\'exportation ZIP :', error);
    alert(`Erreur lors de l'exportation : ${error.message}`);
  } finally {
    if (exportBtn) {
      exportBtn.disabled = false;
      exportBtn.textContent = originalText;
    }
  }
}