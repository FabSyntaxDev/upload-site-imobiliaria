// Credenciais importadas de base/config.js
const supabaseClient = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);

async function login() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const message = document.getElementById('message');

    message.textContent = "Verificando...";
    message.style.color = "black";

    try {
        // Use o novo nome da variável aqui também
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (error) {
            message.textContent = "Usuário ou senha inválidos.";
            message.style.color = "red";
        } else if (data.user) {
            message.textContent = "Sucesso! Entrando...";
            message.style.color = "green";
            
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 500);
        }
    } catch (err) {
        message.textContent = "Erro ao conectar com o servidor.";
    }
}