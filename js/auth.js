async function registrar(){
  const data = {
    id_empleado: document.getElementById("id_empleado").value,
    nombre: document.getElementById("nombre").value,
    fecha_ingreso: document.getElementById("fecha").value,
    entrenador: document.getElementById("entrenador").value,
    distrito: document.getElementById("distrito").value,
    sucursal: document.getElementById("sucursal").value,
    email: document.getElementById("email").value,
    password: document.getElementById("password").value
  };

  await mysupabase.from("empleados").insert([data]);

  alert("Registrado");
  window.location.href = "login.html";
}

async function login(){
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  const { data } = await mysupabase
    .from("empleados")
    .select("*")
    .eq("email", email)
    .eq("password", password)
    .single();

  if(data){
    localStorage.setItem("empleado", JSON.stringify(data));
    window.location.href = "Indice.html";
  } else {
    alert("Credenciales incorrectas");
  }
}

function irRegistro(){
  window.location.href = "register.html";
}