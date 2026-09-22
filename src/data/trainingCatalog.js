/* =========================================================
   CATÁLOGO DE TREINOS
   Fonte única dos treinos padrão do aplicativo.

   Esta primeira etapa é compatível com o app legado:
   o módulo expõe os dados em window.MeuTreinoCatalog e não
   altera o comportamento atual até o app.js passar a consumi-lo.
   ========================================================= */
(function () {
  "use strict";

  const TRAININGS = {
    A: {
      name: "Treino A",
      muscles: ["Costas", "Bíceps", "Abdominais"],
      sections: [
        { name: "Costas", exercises: [
          ["Puxador frente", "4", "12/12/8/8"],
          ["Crucifixo inverso", "", ""],
          ["Extensão lombar", "", ""],
          ["Máquina remo ART", "4", "8"],
          ["Pull down", "", ""],
          ["Pull-over", "", ""],
          ["Puxador triangular ART", "4", "12/12/8/8"],
          ["Máquina remo ART aberta", "4", "8"]
        ]},
        { name: "Bíceps", exercises: [
          ["Banco Scott", "4", "8 (P.C.)"],
          ["Rosca Cross Over", "4", "8"],
          ["Rosca", "", ""],
          ["Rosca", "", ""]
        ]},
        { name: "Abdominais", exercises: [
          ["Crunch", "", ""],
          ["Crunch + remador", "4", "15 + 10"],
          ["Flexão lateral", "", ""],
          ["Inferior", "", ""],
          ["Oblíquo", "", ""],
          ["Tesoura", "", ""],
          ["Prancha 30m.", "4", "45 segundos"]
        ]}
      ]
    },
    B: {
      name: "Treino B",
      muscles: ["Peitorais", "Tríceps", "Ombros"],
      sections: [
        { name: "Peitorais", exercises: [
          ["Cross Over", "", ""],
          ["Crucifixo aberto inclinado", "4", "8"],
          ["Fly máquina", "4", "8"],
          ["Paralelas aberta", "", ""],
          ["Supino ART", "4", "12/12/8/8"],
          ["Voador / Peck Deck", "", ""],
          ["Supino reto (H)", "4", "12/12/8/8"]
        ]},
        { name: "Tríceps", exercises: [
          ["Tríceps puxador W", "4", "8 (P.C.)"],
          ["Tríceps francês polia", "4", "8"],
          ["Tríceps graviton", "", ""],
          ["Supino tríceps", "", ""],
          ["Tríceps coice", "", ""]
        ]},
        { name: "Ombros", exercises: [
          ["Crucifixo inverso polia", "", ""],
          ["Desenvolvimento F/C", "", ""],
          ["Elevação frontal", "4", "16"],
          ["Remada alta", "", ""],
          ["Elevação lateral", "4", "8"]
        ]}
      ]
    },
    C: {
      name: "Treino C",
      muscles: ["Membros inferiores"],
      sections: [
        { name: "Membros inferiores", exercises: [
          ["Agachamento barra", "", ""],
          ["Agachamento Hack", "3–4", "12/12/8/8"],
          ["Cadeira extensora", "4", "8"],
          ["Cadeira flexora", "4", "8"],
          ["Leg Press A/B", "", ""],
          ["Leg Press 45°", "3–4", "12/12/8/8"],
          ["Stiff", "", ""],
          ["Cadeira abdutora", "", ""],
          ["Cadeira adutora", "", ""],
          ["Banco sóleo", "4", "12"],
          ["Gêmeos máquina", "4", "12"],
          ["Glúteos", "", ""],
          ["Agachamento sumô (H)", "3–4", "8"],
          ["Mesa flexora", "4", "8"]
        ]}
      ]
    }
  };

  const ALL_EXERCISES = Object.fromEntries(
    Object.entries(TRAININGS).flatMap(([training, data]) =>
      data.sections.flatMap(section =>
        section.exercises.map((exercise, index) => [
          `${training}-${section.name}-${index}`,
          {
            id: `${training}-${section.name}-${index}`,
            training,
            section: section.name,
            name: exercise[0],
            sets: exercise[1],
            reps: exercise[2]
          }
        ])
      )
    )
  );

  window.MeuTreinoCatalog = Object.freeze({
    trainings: TRAININGS,
    allExercises: ALL_EXERCISES
  });
})();
