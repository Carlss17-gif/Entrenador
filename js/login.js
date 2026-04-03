async function loginEntrenador() {
  const email    = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();
  const errorBox = document.getElementById("error");
  errorBox.innerText = "";

  if (!email || !password) {
    errorBox.innerText = "Completa todos los campos";
    return;
  }

  const { data, error } = await mysupabase.auth.signInWithPassword({ email, password });

  if (error) {
    errorBox.innerText = "Correo o contraseña inválidos";
    return;
  }

  const { data: empleado, error: err2 } = await mysupabase
    .from("empleados")
    .select("entrenador, sucursal, distrito")
    .eq("email", email) 
    .limit(1)
    .single();

  if (err2 || !empleado) {
    errorBox.innerText = "No se encontró el perfil asociado a este correo";
    return;
  }

  // 3. Guardar en localStorage
  localStorage.setItem("sesion_entrenador", JSON.stringify({
    nombre:   empleado.entrenador,
    sucursal: empleado.sucursal,
    distrito: empleado.distrito,
    email:    email
  }));

  window.location.href = "entrenadores.html";
}