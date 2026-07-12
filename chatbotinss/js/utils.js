// Utilitários para preservar parâmetros de URL em redirecionamentos
class URLUtils {
  // Preserva parâmetros importantes como gclid, utm_source, etc.
  static getPreservedParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const preservedParams = {};
    
    // Parâmetros importantes para rastreamento
    const importantParams = [
      'gclid', 'utm_source', 'utm_medium', 'utm_campaign', 
      'utm_term', 'utm_content', 'fbclid', 'msclkid'
    ];
    
    importantParams.forEach(param => {
      if (urlParams.has(param)) {
        preservedParams[param] = urlParams.get(param);
      }
    });
    
    return preservedParams;
  }
  
  // Adiciona parâmetros preservados a uma URL
  static addPreservedParams(url, params = null) {
    if (!params) {
      params = this.getPreservedParams();
    }
    
    if (Object.keys(params).length === 0) {
      return url;
    }
    
    const separator = url.includes('?') ? '&' : '?';
    const queryString = Object.entries(params)
      .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
      .join('&');
    
    return `${url}${separator}${queryString}`;
  }
  
  // Redireciona para uma URL preservando parâmetros importantes
  static redirectWithParams(url) {
    const finalUrl = this.addPreservedParams(url);
    window.location.href = finalUrl;
  }
  
  // Atualiza href de um elemento preservando parâmetros
  static updateHref(element, url) {
    const finalUrl = this.addPreservedParams(url);
    element.href = finalUrl;
  }
  
  // Atualiza onclick de um elemento preservando parâmetros
  static updateOnclick(element, url) {
    const finalUrl = this.addPreservedParams(url);
    element.onclick = () => {
      window.location.href = finalUrl;
    };
  }
  
  // Inicializa automaticamente todos os links da página
  static initPageLinks() {
    const preservedParams = this.getPreservedParams();
    
    if (Object.keys(preservedParams).length === 0) {
      return; // Não há parâmetros para preservar
    }
    
    // Atualizar links internos (.php)
    const internalLinks = document.querySelectorAll('a[href*=".php"]');
    internalLinks.forEach(link => {
      const href = link.getAttribute('href');
      if (href && !href.startsWith('http') && !href.startsWith('#')) {
        this.updateHref(link, href);
      }
    });
    
    // Atualizar botões com onclick para .php
    const buttons = document.querySelectorAll('button[onclick*=".php"]');
    buttons.forEach(button => {
      const onclick = button.getAttribute('onclick');
      if (onclick && onclick.includes('.php')) {
        // Extrair URL do onclick
        const urlMatch = onclick.match(/['"`]([^'"`]*\.php[^'"`]*)['"`]/);
        if (urlMatch) {
          const url = urlMatch[1];
          button.onclick = () => this.redirectWithParams(url);
        }
      }
    });
    
    console.log('Parâmetros preservados:', preservedParams);
  }
}

// Função global para facilitar o uso
function redirectWithParams(url) {
  URLUtils.redirectWithParams(url);
}

function addPreservedParams(url) {
  return URLUtils.addPreservedParams(url);
}

// Inicializar automaticamente quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
  URLUtils.initPageLinks();
});
