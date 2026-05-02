
// Função auxiliar para converter valor monetário para número
function currencyToNumber(value) {
    if (!value) return 0;
    return parseFloat(value.replace(/[^\d,]/g, '').replace(',', '.'));
}

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('imovelForm');
    const descricao = document.getElementById('descricao');
    const counter = document.getElementById('charCounter');
    const fotosInput = document.getElementById('fotos');
    const photoCounter = document.getElementById('photoCounter');
    const photoPreview = document.getElementById('photo-preview');
    let selectedFiles = [];

    // 1. Contador de Caracteres (Descrição)
    descricao.addEventListener('input', () => {
        const remaining = 5000 - descricao.value.length;
        counter.textContent = `${remaining} caracteres restantes`;
        counter.style.color = remaining < 50 ? 'red' : '#666';
    });

    // 2. Máscara de Moeda (Aluguel, Condo, IPTU)
    const currencyInputs = [
        document.getElementById('aluguel'),
        document.getElementById('condo'),
        document.getElementById('iptu')
    ];

    currencyInputs.forEach(input => {
        input.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');
            if (value === '') {
                e.target.value = '';
                return;
            }
            value = (value / 100).toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL'
            });
            e.target.value = value;
        });
    });

    // 3. Lógica de Fotos (Upload, Preview e Drag-and-Drop para Reordenação)
    let draggedIndex = null;
    const photoCache = {}; // Cache para armazenar DataURLs e arquivos

    function renderPhotos() {
        photoPreview.innerHTML = '';
        photoCounter.textContent = `${selectedFiles.length} fotos selecionadas`;

        selectedFiles.forEach((fileObj, index) => {
            const container = document.createElement('div');
            container.className = 'photo-item';
            container.draggable = true;
            container.dataset.index = index;

            const img = document.createElement('img');
            img.src = fileObj.dataURL || fileObj;
            img.alt = `Foto ${index + 1}`;

            const indexLabel = document.createElement('div');
            indexLabel.className = 'photo-index';
            indexLabel.textContent = index + 1;

            const btnRemove = document.createElement('button');
            btnRemove.type = 'button';
            btnRemove.className = 'photo-remove-btn';
            btnRemove.textContent = '✕';
            btnRemove.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                selectedFiles.splice(index, 1);
                renderPhotos();
            });

            container.appendChild(img);
            container.appendChild(indexLabel);
            container.appendChild(btnRemove);

            // Eventos de drag
            container.addEventListener('dragstart', (e) => {
                draggedIndex = index;
                container.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
            });

            container.addEventListener('dragend', (e) => {
                container.classList.remove('dragging');
                draggedIndex = null;
                document.querySelectorAll('.photo-item').forEach(item => {
                    item.classList.remove('drag-over');
                });
            });

            container.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                if (draggedIndex !== null && draggedIndex !== index) {
                    container.classList.add('drag-over');
                }
            });

            container.addEventListener('dragleave', (e) => {
                container.classList.remove('drag-over');
            });

            container.addEventListener('drop', (e) => {
                e.preventDefault();
                e.stopPropagation();

                if (draggedIndex !== null && draggedIndex !== index) {
                    const draggedFile = selectedFiles[draggedIndex];
                    selectedFiles.splice(draggedIndex, 1);
                    const insertIndex = draggedIndex < index ? index - 1 : index;
                    selectedFiles.splice(insertIndex, 0, draggedFile);
                    draggedIndex = null;
                    renderPhotos();
                }
                container.classList.remove('drag-over');
            });

            photoPreview.appendChild(container);
        });
    }

    fotosInput.addEventListener('change', (e) => {
        const files = Array.from(e.target.files);

        if (selectedFiles.length + files.length > 50) {
            alert('Você pode selecionar no máximo 50 fotos.');
            e.target.value = '';
            return;
        }

        files.forEach(file => {
            const reader = new FileReader();
            reader.onload = (event) => {
                selectedFiles.push({
                    file: file,
                    dataURL: event.target.result
                });
                renderPhotos();
            };
            reader.readAsDataURL(file);
        });

        e.target.value = '';
    });

    // 4. Envio do Formulário - Integrado com Supabase
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        try {
            // Verificar se usuário está autenticado
            const { data: { user } } = await supabaseClient.auth.getUser();

            if (!user) {
                alert('Você precisa estar autenticado para cadastrar um imóvel.');
                window.location.href = 'index.html';
                return;
            }

            // Mostrar feedback ao usuário
            const submitBtn = form.querySelector('.btn-submit');
            const originalText = submitBtn.textContent;
            submitBtn.textContent = 'Cadastrando...';
            submitBtn.disabled = true;

            // Coletar dados do formulário
            const endereco = document.getElementById('endereco').value;
            const bairro = document.getElementById('bairro').value;
            const cidade = document.getElementById('cidade').value;
            const uf = document.getElementById('uf').value;
            const aluguel = currencyToNumber(document.getElementById('aluguel').value);
            const tipoImovel = document.getElementById('tipoImovel').value;
            const condo = currencyToNumber(document.getElementById('condo').value);
            const iptu = currencyToNumber(document.getElementById('iptu').value);
            const quartos = parseInt(document.getElementById('quartos').value);
            const banheiros = parseInt(document.getElementById('banheiros').value);
            const vagas = parseInt(document.getElementById('vagas').value);
            const metragem = parseFloat(document.getElementById('metragem').value.replace(',', '.')) || 0;
            const isAluguel = document.getElementById('aluguelVenda').value === 'true';
            const descricaoText = descricao.value;

            if (isAluguel && !document.getElementById('aluguel').value.trim()) {
                alert('Informe o valor de aluguel para imóveis de aluguel.');
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
                return;
            }

            // Array para armazenar URLs das fotos
            let fotosURLs = [];

            // Upload das fotos se houver
            const files = selectedFiles;
            if (files.length > 0) {
                for (let fileObj of files) {
                    const file = fileObj.file;
                    const fileExt = file.name.split('.').pop();
                    const fileName = `${user.id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

                    const { data: uploadData, error: uploadError } = await supabaseClient.storage
                        .from('imovel-fotos')
                        .upload(fileName, file);

                    if (uploadError) {
                        console.error('Erro ao fazer upload da foto:', uploadError);
                        throw new Error('Erro ao fazer upload das fotos');
                    }

                    // Obter URL pública da foto
                    const { data } = supabaseClient.storage
                        .from('imovel-fotos')
                        .getPublicUrl(fileName);

                    fotosURLs.push(data.publicUrl);
                }
            }

            // Inserir dados no banco de dados
            const { data, error } = await supabaseClient
                .from('imoveis')
                .insert([{
                    user_id: user.id,
                    endereco: endereco,
                    bairro: bairro,
                    cidade: cidade,
                    uf: uf,
                    tipo: tipoImovel,
                    valor_aluguel: aluguel,
                    valor_condominio: condo,
                    valor_iptu: iptu,
                    quartos: quartos,
                    banheiros: banheiros,
                    vagas: vagas,
                    metragem: metragem,
                    aluguel: isAluguel,
                    descricao: descricaoText,
                    fotos: fotosURLs, // Array de URLs das fotos
                    data_criacao: new Date().toISOString()
                }]);

            if (error) {
                console.error('Erro ao salvar imóvel:', error);
                throw error;
            }

            // Sucesso
            alert('Imóvel cadastrado com sucesso!');
            form.reset();
            selectedFiles = [];
            photoCounter.textContent = '0 fotos selecionadas';
            photoPreview.innerHTML = '';
            counter.textContent = '5000 caracteres restantes';

        } catch (error) {
            console.error('Erro geral:', error);
            alert('Erro ao cadastrar imóvel: ' + (error.message || 'Tente novamente'));
        } finally {
            // Restaurar botão
            const submitBtn = form.querySelector('.btn-submit');
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    });
});