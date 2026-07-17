import { dbFs } from './firebase-config.js';
import { 
    collection, 
    addDoc, 
    getDocs, 
    doc, 
    setDoc, 
    onSnapshot 
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

document.addEventListener('alpine:init', () => {
    Alpine.data('stockApp', () => ({
        // App State Properties
        isAuthenticated: false,
        authChecking: false,
        ready: false,
        currentUsername: '',
        currentRole: 'readonly',
        orderViewTab: 'pending',
        filterCat: 'all',
        
        // Modal Flags
        showAccountModal: false,
        showUserAdminModal: false,
        showNewItemModal: false,
        
        // Forms Context Setup
        loginForm: { username: '', password: '' },
        loginError: '',
        newUserForm: { username: '', password: '', role: 'readonly' },
        newCategoryForm: { name: '', emoji: '', paletteIndex: 0 },
        newItemForm: { name: '', categoryId: '', supplierName: '', threshold: 10, mrp: 0 },
        accountForm: { currentPassword: '', newPassword: '' },
        accountError: '',
        accountSuccess: '',
        formInward: { supplierName: '', itemId: '', qty: '' },
        formOutward: { itemId: '', department: 'Kitchen', qty: '' },
        orderDesk: { supplierId: '', selectedItemId: '', selectedQty: '', basket: [] },
        
        // Matrix Event Form Structures
        cateringForm: { partyName: '', paxCount: '', rawTextMenu: '' },
        cateringModal: { show: false, label: '', text: '' },
        
        // System Data Storage Repositories
        items: [],
        categories: [],
        suppliers: [],
        users: [],
        logs: [],
        processedPurchaseOrders: [],
        events: [],
        departments: ['Kitchen', 'Bar', 'Banquet', 'Room Service'],
        paletteOptions: [
            { bg: '#eff6ff', text: '#1e40af', border: '#bfdbfe' },
            { bg: '#fffbeb', text: '#92400e', border: '#fde68a' },
            { bg: '#ecfdf5', text: '#065f46', border: '#a7f3d0' },
            { bg: '#f3e8ff', text: '#6b21a8', border: '#e9d5ff' },
            { bg: '#fce7f3', text: '#9d174d', border: '#fbcfe8' }
        ],
        lastLogId: null,
        lastLogType: null,

        // Core Init Lifecycle Hook Method
        init() {
            // Setup real-time listeners for data pipelines
            onSnapshot(collection(dbFs, "items"), (snapshot) => {
                this.items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            });
            onSnapshot(collection(dbFs, "categories"), (snapshot) => {
                this.categories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            });
            onSnapshot(collection(dbFs, "suppliers"), (snapshot) => {
                this.suppliers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            });
            onSnapshot(collection(dbFs, "catering_events"), (snapshot) => {
                this.events = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            });

            // Standard mock local development pass logic mapping:
            this.isAuthenticated = true; 
            this.currentUsername = "Admin Studio Desk";
            this.currentRole = "admin";
            this.ready = true;
        },

        // --- MATRIX ENGINE CONTROLLER LAYER INTERFACES ---
        getEventsForDate(dateStr) {
            return this.events.filter(ev => ev.date === dateStr);
        },

        getEventCountForDate(dateStr) {
            return this.getEventsForDate(dateStr).length;
        },

        viewCateringTextMenu(eventObj) {
            this.cateringModal.label = `${eventObj.partyName} (${eventObj.paxCount} Pax)`;
            this.cateringModal.text = eventObj.menuText;
            this.cateringModal.show = true;
        },

        async submitDirectTextCatering(dateString) {
            if (!this.cateringForm.partyName || !this.cateringForm.rawTextMenu) {
                alert("Please declare event parameters and paste document menu data layout strings.");
                return;
            }

            const payload = {
                date: dateString,
                partyName: this.cateringForm.partyName,
                paxCount: Number(this.cateringForm.paxCount) || 0,
                menuText: this.cateringForm.rawTextMenu,
                created_at: Date.now()
            };

            try {
                const docRef = await addDoc(collection(dbFs, "catering_events"), payload);
                payload.id = docRef.id;
                this.events.push(payload);

                // Reset forms fields values state parameters
                this.cateringForm.partyName = '';
                this.cateringForm.paxCount = '';
                this.cateringForm.rawTextMenu = '';

                alert("Staged portfolio written securely to target Firestore database instance.");
            } catch (err) {
                console.error("Mutation failed: ", err);
                alert("Transaction dropped. Confirm Cloud Security rule access states.");
            }
        },

        // Placeholder system dependencies logic mapping targets
        verifyLogin() { this.isAuthenticated = true; },
        logout() { this.isAuthenticated = false; },
        get processedItems() {
            if (this.filterCat === 'all') return this.items;
            return this.items.filter(i => i.category_name === this.filterCat);
        },
        get filteredInwardItems() { return this.items; },
        get filteredOrderDeskItems() { return this.items; }
    }));
});
