/* =========================================================
   GERENCIADOR DE TREINOS - GymIA
   ========================================================= */

class TreinoManager {
  constructor() {
    this.db = null;
    this.apiUrl = window.MEU_TREINO_CONFIG?.AI_API_URL || 'https://prjacademiaia.onrender.com';
    this.initDB();
  }

  // ========== IndexedDB ==========

  initDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open('GymIA_Treinos', 1);

      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('treinos')) {
          const store = db.createObjectStore('treinos', { keyPath: 'id', autoIncrement: true });
          store.createIndex('userId', 'userId', { unique: false });
          store.createIndex('data', 'data', { unique: false });
        }
      };

      req.onsuccess = () => {
        this.db = req.result;
        resolve(this.db);
      };

      req.onerror = () => reject(req.error);
    });
  }

  // ========== CRUD Operações ==========

  async criarTreino(dados) {
    const token = localStorage.getItem('auth_token');
    const userInfo = JSON.parse(localStorage.getItem('user_info') || '{}');

    const treino = {
      titulo: dados.titulo,
      descricao: dados.descricao,
      tipo: dados.tipo, // 'A', 'B', 'C', etc
      exercicios: dados.exercicios || [],
      data: new Date().toISOString(),
      duracao: dados.duracao || 0, // em minutos
      intensidade: dados.intensidade || 'media', // baixa, media, alta
      userId: userInfo.id || 'local',
      sincronizado: false
    };

    // Salvar localmente
    const id = await this.saveLocalTreino(treino);
    treino.id = id;

    // Tentar sincronizar com backend
    if (token) {
      try {
        const response = await fetch(`${this.apiUrl}/api/treinos`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(treino)
        });

        if (response.ok) {
          const backendTreino = await response.json();
          treino.backendId = backendTreino.id;
          treino.sincronizado = true;
          await this.saveLocalTreino(treino);
        }
      } catch (error) {
        console.error('Erro ao sincronizar treino:', error);
      }
    }

    return treino;
  }

  async getTreinos(filtro = {}) {
    const token = localStorage.getItem('auth_token');
    const userInfo = JSON.parse(localStorage.getItem('user_info') || '{}');
    const userId = userInfo.id || 'local';

    let treinos = await this.getLocalTreinos();
    treinos = treinos.filter(t => t.userId === userId);

    // Aplicar filtros
    if (filtro.tipo) {
      treinos = treinos.filter(t => t.tipo === filtro.tipo);
    }

    if (filtro.intensidade) {
      treinos = treinos.filter(t => t.intensidade === filtro.intensidade);
    }

    // Ordenar por data (mais recentes primeiro)
    treinos.sort((a, b) => new Date(b.data) - new Date(a.data));

    return treinos;
  }

  async getTreinoById(id) {
    const db = this.db || await this.initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('treinos', 'readonly');
      const req = tx.objectStore('treinos').get(id);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async atualizarTreino(id, dados) {
    const treino = await this.getTreinoById(id);
    if (!treino) throw new Error('Treino não encontrado');

    const treinoAtualizado = { ...treino, ...dados, data: new Date().toISOString() };

    // Atualizar localmente
    await this.saveLocalTreino(treinoAtualizado);

    // Sincronizar com backend se houver
    const token = localStorage.getItem('auth_token');
    if (token && treino.backendId) {
      try {
        await fetch(`${this.apiUrl}/api/treinos/${treino.backendId}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(treinoAtualizado)
        });
      } catch (error) {
        console.error('Erro ao sincronizar atualização:', error);
      }
    }

    return treinoAtualizado;
  }

  async deletarTreino(id) {
    const db = this.db || await this.initDB();

    // Obter treino antes de deletar (para pegar backendId)
    const treino = await this.getTreinoById(id);

    // Deletar localmente
    await new Promise((resolve, reject) => {
      const tx = db.transaction('treinos', 'readwrite');
      const req = tx.objectStore('treinos').delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });

    // Deletar no backend se houver
    const token = localStorage.getItem('auth_token');
    if (token && treino?.backendId) {
      try {
        await fetch(`${this.apiUrl}/api/treinos/${treino.backendId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
      } catch (error) {
        console.error('Erro ao deletar no backend:', error);
      }
    }

    return true;
  }

  // ========== Operações Locais ==========

  private async getLocalTreinos() {
    const db = this.db || await this.initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('treinos', 'readonly');
      const req = tx.objectStore('treinos').getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  private async saveLocalTreino(treino) {
    const db = this.db || await this.initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('treinos', 'readwrite');
      const store = tx.objectStore('treinos');

      const req = treino.id ? store.put(treino) : store.add(treino);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  // ========== Estatísticas ==========

  async getEstatisticas() {
    const treinos = await this.getTreinos();

    return {
      totalTreinos: treinos.length,
      treinosEsSemana: treinos.filter(t => {
        const dataUmaSemana = new Date();
        dataUmaSemana.setDate(dataUmaSemana.getDate() - 7);
        return new Date(t.data) > dataUmaSemana;
      }).length,
      intensidadeMedia: this.calcularIntensidadeMedia(treinos),
      tiposUtilizados: [...new Set(treinos.map(t => t.tipo))]
    };
  }

  private calcularIntensidadeMedia(treinos) {
    if (!treinos.length) return 0;
    const intensidades = { baixa: 1, media: 2, alta: 3 };
    const soma = treinos.reduce((acc, t) => acc + (intensidades[t.intensidade] || 0), 0);
    return (soma / treinos.length).toFixed(1);
  }

  // ========== Utilitários ==========

  formatarData(isoString) {
    return new Date(isoString).toLocaleDateString('pt-BR', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  formatarHora(isoString) {
    return new Date(isoString).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}

// Inicializar gerenciador globalmente
window.treinoManager = new TreinoManager();
