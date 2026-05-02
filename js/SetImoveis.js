const supabaseClient = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);

const state = {
    user: null,
    properties: [],
    filteredProperties: []
};

const elements = {
    summary: document.getElementById('propertySummary'),
    tableBody: document.getElementById('propertyTableBody'),
    emptyState: document.getElementById('emptyState'),
    searchInput: document.getElementById('propertySearch'),
    editModal: document.getElementById('editModal'),
    editForm: document.getElementById('editPropertyForm'),
    closeModalButton: document.getElementById('closeModalButton'),
    cancelEditButton: document.getElementById('cancelEditButton'),
    editPropertyId: document.getElementById('editPropertyId'),
    editEndereco: document.getElementById('editEndereco'),
    editBairro: document.getElementById('editBairro'),
    editCidade: document.getElementById('editCidade'),
    editUf: document.getElementById('editUf'),
    editAluguel: document.getElementById('editAluguel'),
    editCondominio: document.getElementById('editCondominio'),
    editIptu: document.getElementById('editIptu'),
    editMetragem: document.getElementById('editMetragem'),
    editQuartos: document.getElementById('editQuartos'),
    editBanheiros: document.getElementById('editBanheiros'),
    editVagas: document.getElementById('editVagas'),
    editTipo: document.getElementById('editTipo'), // NOVO
    editAluguelVenda: document.getElementById('editAluguelVenda'),
    editStatus: document.getElementById('editStatus'),
    editDescricao: document.getElementById('editDescricao')
};

window.addEventListener('DOMContentLoaded', () => {
    initPage();
    elements.searchInput.addEventListener('input', handleSearchInput);
    elements.tableBody.addEventListener('click', handleTableClick);
    elements.closeModalButton.addEventListener('click', hideModal);
    elements.cancelEditButton.addEventListener('click', hideModal);
    elements.editForm.addEventListener('submit', handleEditSubmit);
    elements.editModal.querySelector('.modal-backdrop').addEventListener('click', hideModal);
});

async function initPage() {
    try {
        const { data: { session }, error } = await supabaseClient.auth.getSession();
        if (error || !session) {
            window.location.href = 'index.html';
            return;
        }
        state.user = session.user;
        await loadProperties();
    } catch (error) {
        console.error('Erro ao iniciar página:', error);
        window.location.href = 'index.html';
    }
}

async function loadProperties() {
    elements.tableBody.innerHTML = '<tr><td colspan="7" class="loading-row">Carregando...</td></tr>';
    const { data, error } = await supabaseClient
        .from('imoveis')
        .select('*')
        .eq('user_id', state.user.id)
        .order('data_criacao', { ascending: false });

    if (error) {
        console.error('Erro ao buscar imóveis:', error);
        elements.summary.textContent = 'Não foi possível carregar os imóveis.';
        elements.tableBody.innerHTML = '<tr><td colspan="7" class="loading-row">Ocorreu um erro ao carregar.</td></tr>';
        return;
    }

    state.properties = data || [];
    state.filteredProperties = [...state.properties];
    renderProperties();
}

function formatCurrency(value) {
    if (value === null || value === undefined || Number.isNaN(Number(value))) {
        return 'R$ 0,00';
    }
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(Number(value));
}

function renderProperties() {
    const properties = state.filteredProperties;
    elements.summary.textContent = `${properties.length} imóvel${properties.length === 1 ? '' : 's'} encontrado${properties.length === 1 ? '' : 's'}`;

    if (!properties.length) {
        elements.tableBody.innerHTML = '<tr><td colspan="7" class="loading-row">Nenhum imóvel corresponde à busca.</td></tr>';
        elements.emptyState.classList.remove('hidden');
        return;
    }

    elements.emptyState.classList.add('hidden');

    elements.tableBody.innerHTML = properties.map((property, index) => {
        // Mostra o tipo (Casa, Apto) na tabela se existir, caso contrário mostra o tipo de negócio
        const typeLabel = property.tipo || (property.aluguel ? 'Aluguel' : 'Venda');
        const statusLabel = property.status ? 'Disponível' : 'Indisponível';
        const statusClass = property.status ? 'available' : 'unavailable';
        const valueLabel = property.valor_aluguel ? formatCurrency(property.valor_aluguel) : 'R$ 0,00';
        const locationLabel = `${property.cidade || '-'} / ${property.uf || '-'}`;

        return `
            <tr data-id="${property.id}">
                <td>${index + 1}</td>
                <td><strong>${property.endereco || '-'}</strong><span>${property.bairro || ''}</span></td>
                <td>${locationLabel}</td>
                <td>${valueLabel}</td>
                <td>${typeLabel}</td>
                <td><span class="status-pill ${statusClass}">${statusLabel}</span></td>
                <td>
                    <div class="action-group">
                        <button type="button" class="action-button edit" data-action="edit" data-id="${property.id}"><i class="fa-solid fa-pen"></i> Editar</button>
                        <button type="button" class="action-button delete" data-action="delete" data-id="${property.id}"><i class="fa-solid fa-trash"></i> Apagar</button>
                        <button type="button" class="action-button open" data-action="open" data-id="${property.id}"><i class="fa-solid fa-arrow-up-right-from-square"></i> Ir</button>
                    </div>
                </td>
            </tr>`;
    }).join('');
}

function handleSearchInput(event) {
    const query = event.target.value.trim().toLowerCase();
    if (!query) {
        state.filteredProperties = [...state.properties];
    } else {
        state.filteredProperties = state.properties.filter(property => {
            const content = [property.endereco, property.bairro, property.cidade, property.uf, property.tipo]
                .filter(Boolean)
                .join(' ') 
                .toLowerCase();
            return content.includes(query);
        });
    }
    renderProperties();
}

function handleTableClick(event) {
    const button = event.target.closest('button[data-action]');
    if (!button) return;

    const action = button.dataset.action;
    const propertyId = button.dataset.id;
    const property = state.properties.find(item => String(item.id) === propertyId);
    
    if (!property) return;

    if (action === 'edit') openEditModal(property);
    else if (action === 'delete') deleteProperty(property);
    else if (action === 'open') goToProperty(property);
}

function openEditModal(property) {
    elements.editPropertyId.value = property.id;
    elements.editEndereco.value = property.endereco || '';
    elements.editBairro.value = property.bairro || '';
    elements.editCidade.value = property.cidade || '';
    elements.editUf.value = property.uf || '';
    elements.editAluguel.value = property.valor_aluguel ? formatCurrency(property.valor_aluguel) : '';
    elements.editCondominio.value = property.valor_condominio ? formatCurrency(property.valor_condominio) : '';
    elements.editIptu.value = property.valor_iptu ? formatCurrency(property.valor_iptu) : '';
    elements.editMetragem.value = property.metragem || '';
    elements.editQuartos.value = property.quartos || ''; 
    elements.editBanheiros.value = property.banheiros || '';
    elements.editVagas.value = property.vagas || '';
    elements.editTipo.value = property.tipo || 'Apartamento'; // CARREGA O TIPO
    elements.editAluguelVenda.value = String(property.aluguel);
    elements.editStatus.value = String(property.status ?? true);
    elements.editDescricao.value = property.descricao || '';

    elements.editModal.classList.remove('hidden');
}

function hideModal() {
    elements.editModal.classList.add('hidden');
}

function currencyToNumber(value) {
    if (!value) return null;
    const cleaned = value.toString().replace(/[^\d,.-]/g, '').replace(',', '.');
    const numberValue = parseFloat(cleaned);
    return Number.isFinite(numberValue) ? numberValue : null;
}

async function handleEditSubmit(event) {
    event.preventDefault();

    const id = elements.editPropertyId.value;
    const updatedProperty = {
        endereco: elements.editEndereco.value.trim(),
        bairro: elements.editBairro.value.trim(),
        cidade: elements.editCidade.value.trim(),
        uf: elements.editUf.value.trim().toUpperCase(),
        valor_aluguel: currencyToNumber(elements.editAluguel.value),
        valor_condominio: currencyToNumber(elements.editCondominio.value),
        valor_iptu: currencyToNumber(elements.editIptu.value),
        metragem: elements.editMetragem.value ? parseFloat(elements.editMetragem.value) : null,
        quartos: elements.editQuartos.value ? parseInt(elements.editQuartos.value, 10) : null,
        banheiros: elements.editBanheiros.value ? parseInt(elements.editBanheiros.value, 10) : null,
        vagas: elements.editVagas.value ? parseInt(elements.editVagas.value, 10) : null,
        tipo: elements.editTipo.value, // SALVA O TIPO
        aluguel: elements.editAluguelVenda.value === 'true',
        status: elements.editStatus.value === 'true',
        descricao: elements.editDescricao.value.trim(),
        data_atualizacao: new Date().toISOString()
    };

    const { error } = await supabaseClient
        .from('imoveis')
        .update(updatedProperty)
        .eq('id', id);

    if (error) {
        console.error('Erro ao atualizar imóvel:', error);
        alert('Não foi possível atualizar o imóvel.');
        return;
    }

    const index = state.properties.findIndex(item => String(item.id) === id);
    if (index !== -1) {
        state.properties[index] = { ...state.properties[index], ...updatedProperty };
        handleSearchInput({ target: { value: elements.searchInput.value } });
    }

    alert('Imóvel atualizado com sucesso.');
    hideModal();
}

async function deleteProperty(property) {
    const confirmed = confirm(`Tem certeza que deseja apagar o imóvel "${property.endereco || 'sem endereço'}"?`);
    if (!confirmed) return;

    const { error } = await supabaseClient.from('imoveis').delete().eq('id', property.id);

    if (error) {
        alert('Não foi possível apagar o imóvel.');
        return;
    }

    state.properties = state.properties.filter(item => item.id !== property.id);
    handleSearchInput({ target: { value: elements.searchInput.value } });
    alert('Imóvel apagado com sucesso.');
}

function goToProperty(property) {
    const placeholderUrl = `imovel.html?id=${property.id}`;
    alert('URL: ' + placeholderUrl);
}