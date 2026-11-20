fetch("recetas/cheesecake.json")
    .then(r => r.json())
    .then(receta => {
        document.getElementById("estado").textContent =
            "Receta cargada: " + receta.titulo;
    })
    .catch(() => {
        document.getElementById("estado").textContent = "No pude leer la receta 😅";
    });