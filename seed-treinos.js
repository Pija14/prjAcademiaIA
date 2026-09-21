/* =========================================================
   SEED DE TREINOS - Dados de Exemplo para Teste
   ========================================================= */

async function seedTreinos() {
  console.log('🌱 Iniciando seeding de treinos...');

  const treinos = [
    {
      titulo: 'Treino A - Peito e Tríceps',
      tipo: 'A',
      intensidade: 'alta',
      duracao: 60,
      descricao: 'Foco em desenvolvimento de peito e tríceps com exercícios compostos',
      exercicios: [
        { id: 1, nome: 'Supino Inclinado', series: 4, repeticoes: 8, descanso: 90, peso: 80 },
        { id: 2, nome: 'Supino Reto', series: 3, repeticoes: 10, descanso: 60, peso: 70 },
        { id: 3, nome: 'Crucifixo', series: 3, repeticoes: 12, descanso: 45, peso: 20 },
        { id: 4, nome: 'Mergulho Peitoral', series: 3, repeticoes: 8, descanso: 90, peso: null },
        { id: 5, nome: 'Tríceps na Corda', series: 3, repeticoes: 12, descanso: 45, peso: 30 },
        { id: 6, nome: 'Tríceps Francês', series: 3, repeticoes: 10, descanso: 60, peso: 20 }
      ]
    },
    {
      titulo: 'Treino B - Costas e Bíceps',
      tipo: 'B',
      intensidade: 'alta',
      duracao: 75,
      descricao: 'Desenvolvimento de costas e bíceps com puxadas e flexões',
      exercicios: [
        { id: 7, nome: 'Barra Fixa', series: 4, repeticoes: 8, descanso: 90, peso: null },
        { id: 8, nome: 'Rosca Direta', series: 4, repeticoes: 10, descanso: 60, peso: 30 },
        { id: 9, nome: 'Puxada Frontal', series: 3, repeticoes: 10, descanso: 60, peso: 60 },
        { id: 10, nome: 'Remada Baixa', series: 3, repeticoes: 10, descanso: 60, peso: 80 },
        { id: 11, nome: 'Rosca Alternada', series: 3, repeticoes: 12, descanso: 45, peso: 15 },
        { id: 12, nome: 'Encolhimento com Halteres', series: 3, repeticoes: 12, descanso: 45, peso: 30 }
      ]
    },
    {
      titulo: 'Treino C - Pernas',
      tipo: 'C',
      intensidade: 'alta',
      duracao: 90,
      descricao: 'Treino intenso de pernas com foco em força e hipertrofia',
      exercicios: [
        { id: 13, nome: 'Agachamento Livre', series: 4, repeticoes: 8, descanso: 120, peso: 100 },
        { id: 14, nome: 'Leg Press', series: 3, repeticoes: 10, descanso: 90, peso: 200 },
        { id: 15, nome: 'Extensora', series: 3, repeticoes: 12, descanso: 60, peso: 80 },
        { id: 16, nome: 'Flexora', series: 3, repeticoes: 12, descanso: 60, peso: 70 },
        { id: 17, nome: 'Levantamento Terra Romeno', series: 3, repeticoes: 8, descanso: 90, peso: 120 },
        { id: 18, nome: 'Gêmeo no Smith', series: 3, repeticoes: 15, descanso: 45, peso: 80 }
      ]
    },
    {
      titulo: 'Treino D - Ombros',
      tipo: 'D',
      intensidade: 'media',
      duracao: 60,
      descricao: 'Desenvolvimento completo de ombros e deltoides',
      exercicios: [
        { id: 19, nome: 'Desenvolvimento Halteres', series: 4, repeticoes: 8, descanso: 90, peso: 30 },
        { id: 20, nome: 'Desenvolvimento Smith', series: 3, repeticoes: 10, descanso: 60, peso: 60 },
        { id: 21, nome: 'Elevação Lateral', series: 3, repeticoes: 12, descanso: 45, peso: 15 },
        { id: 22, nome: 'Elevação Frontal', series: 3, repeticoes: 12, descanso: 45, peso: 12 },
        { id: 23, nome: 'Inversão Máquina', series: 3, repeticoes: 12, descanso: 45, peso: 50 },
        { id: 24, nome: 'Face Pull', series: 3, repeticoes: 15, descanso: 45, peso: 40 }
      ]
    },
    {
      titulo: 'Cardio - HIIT 30min',
      tipo: 'personalizado',
      intensidade: 'alta',
      duracao: 30,
      descricao: 'Treino de cardio intenso com alteração de ritmo',
      exercicios: [
        { id: 25, nome: 'Corrida Aquecimento', series: 1, repeticoes: 1, descanso: 0, peso: null, notas: '5 minutos moderado' },
        { id: 26, nome: 'Corrida Sprint', series: 8, repeticoes: 1, descanso: 30, peso: null, notas: '30 segundos máximo' },
        { id: 27, nome: 'Corrida Recuperação', series: 1, repeticoes: 1, descanso: 0, peso: null, notas: '5 minutos cool down' }
      ]
    },
    {
      titulo: 'Flexibilidade e Mobilidade',
      tipo: 'personalizado',
      intensidade: 'baixa',
      duracao: 45,
      descricao: 'Sessão de alongamento e mobilidade articular',
      exercicios: [
        { id: 28, nome: 'Alongamento Estático', series: 1, repeticoes: 1, descanso: 0, peso: null, notas: '30 segundos cada grupo' },
        { id: 29, nome: 'Yoga Básico', series: 1, repeticoes: 1, descanso: 0, peso: null, notas: 'Posições fundamentais' },
        { id: 30, nome: 'Foam Roller', series: 1, repeticoes: 1, descanso: 0, peso: null, notas: '2 minutos cada grupo muscular' }
      ]
    }
  ];

  try {
    for (const treino of treinos) {
      const criadoEm = new Date();
      criadoEm.setDate(criadoEm.getDate() - Math.floor(Math.random() * 14)); // Últimas 2 semanas

      const treinoData = {
        ...treino,
        data: criadoEm.toISOString(),
        userId: JSON.parse(localStorage.getItem('user_info') || '{}').id || 'local',
        sincronizado: false
      };

      const resultado = await window.treinoManager.criarTreino(treinoData);
      console.log(`✅ Treino criado: ${treino.titulo}`, resultado);
    }

    console.log('🎉 Seeding concluído com sucesso!');
    console.log(`📊 ${treinos.length} treinos foram adicionados`);
    console.log('🔄 Recarregue a página para ver os treinos');

    return true;
  } catch (error) {
    console.error('❌ Erro ao fazer seeding:', error);
    return false;
  }
}

// Função auxiliar para limpar dados
async function limparTreinos() {
  console.log('🗑️ Limpando todos os treinos...');
  try {
    const treinos = await window.treinoManager.getTreinos();
    for (const treino of treinos) {
      await window.treinoManager.deletarTreino(treino.id);
    }
    console.log('✅ Todos os treinos foram deletados');
    return true;
  } catch (error) {
    console.error('❌ Erro ao limpar treinos:', error);
    return false;
  }
}

console.log(`
╔═══════════════════════════════════════════╗
║  GymIA - Seed de Treinos Disponível      ║
╚═══════════════════════════════════════════╝

Para criar treinos de exemplo:
  seedTreinos()

Para deletar todos os treinos:
  limparTreinos()

Para listar treinos atuais:
  window.treinoManager.getTreinos().then(t => console.table(t))
`);
