import { dbFs } from './firebase-config.js';
import { 
    collection, 
    addDoc, 
    doc, 
    setDoc, 
    deleteDoc, 
    onSnapshot 
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

document.addEventListener('alpine:init', () => {
    Alpine.data('stockApp', () => ({
        // App Core State Properties
        isAuthenticated: false,
        authChecking: false,
        ready: false,
        currentUsername: '',
        currentRole: 'readonly',
        orderViewTab: 'pending',
        filterCat: 'all',
        
        // Modal State Toggles
        showAccountModal: false,
        showUserAdminModal: false,
        showNewItemModal: false,
        
        // Form Binding Buffers
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
        
        // Catering Clipboard Paste Form Tracking Properties
        cateringForm: { partyName: '', paxCount: '', rawTextMenu: '' },
        cateringModal: { show: false, label: '', text: '' },
        editingEventId: null,
        
        // Data Collections States
        items: [],
        categories: [],
        suppliers: [],
        users: [],
        logs: [],
        processedPurchaseOrders: [],
        events: [],
        departments: ['Kitchen', 'Bar', 'Banquet', 'Room Service'],
        lastLogId: null,
        lastLogType: null,

        // Core App Lifecycle Entry point
        init() {
            // Bind real-time reactive event pipelines to Firebase Cloud Architecture
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

            // Standard Developer Auth Mode bypass configuration
            this.isAuthenticated = true; 
            this.currentUsername = "Corporate Administrator";
            this.currentRole = "admin";
            this.ready = true;
        },

        // --- CATERING EVENT SYSTEM ARCHITECTURE ENGINE ---
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

        clearCateringForm() {
            this.cateringForm.partyName = '';
            this.cateringForm.paxCount = '';
            this.cateringForm.rawTextMenu = '';
            this.editingEventId = null;
        },

        editCateringEvent(eventObj) {
            this.cateringForm.partyName = eventObj.partyName;
            this.cateringForm.paxCount = eventObj.paxCount;
            this.cateringForm.rawTextMenu = eventObj.menuText;
            this.editingEventId = eventObj.id;
            this.creationView = true;
        },

        async deleteCateringEvent(eventId) {
            if (!confirm("Are you sure you want to completely delete this catering event and clear it from the cloud engine?")) return;
            try {
                await deleteDoc(doc(dbFs, "catering_events", eventId));
                this.events = this.events.filter(e => e.id !== eventId);
                alert("Function successfully deleted from firestore cloud records.");
            } catch (err) {
                console.error("Purge failure:", err);
                alert("Operation failed. Verify Firebase connection status permissions.");
            }
        },
        async changeUserRole(userId, newRole) {
    try {
        // Update the specific user document in the "users" collection on Firestore
        await setDoc(doc(dbFs, "users", userId), {
            role: newRole
        }, { merge: true });

        // Update the local state array immediately so the UI reflects the changes instantly
        const idx = this.users.findIndex(u => u.id === userId);
        if (idx !== -1) {
            this.users[idx].role = newRole;
        }

        alert(`Operator privileges successfully escalated/de-escalated to: ${newRole}`);
    } catch (err) {
        console.error("Failed to mutate user configuration:", err);
        alert("Permission denied or database offline. Verify your Firestore Rules.");
    }
},

        async submitDirectTextCatering(dateString) {
            if (!this.cateringForm.partyName || !this.cateringForm.rawTextMenu) {
                alert("Please fill out the corporate client descriptive title and paste raw text menu data.");
                return;
            }

            const payload = {
                date: dateString,
                partyName: this.cateringForm.partyName,
                paxCount: Number(this.cateringForm.paxCount) || 0,
                menuText: this.cateringForm.rawTextMenu,
                updated_at: Date.now()
            };

            try {
                if (this.editingEventId) {
                    // Update current record path execution
                    await setDoc(doc(dbFs, "catering_events", this.editingEventId), payload, { merge: true });
                    const idx = this.events.findIndex(e => e.id === this.editingEventId);
                    if (idx !== -1) this.events[idx] = { id: this.editingEventId, ...payload };
                    this.editingEventId = null;
                    alert("Function record context updated successfully!");
                } else {
                    // Append fresh database document entry path execution
                    payload.created_at = Date.now();
                    const docRef = await addDoc(collection(dbFs, "catering_events"), payload);
                    payload.id = docRef.id;
                    this.events.push(payload);
                    alert("Fresh function logged successfully!");
                }
                this.clearCateringForm();
            } catch (err) {
                console.error("Mutation failure: ", err);
                alert("Write request rejected. Check security policies configurations.");
            }
        },

        // --- BACKEND FALLBACK PLACEHOLDERS STUBS ---
        verifyLogin() { 
            this.isAuthenticated = true; 
            this.currentUsername = this.loginForm.username || "Operator";
            this.currentRole = "admin";
        },
        logout() { this.isAuthenticated = false; },
        get processedItems() {
            if (this.filterCat === 'all') return this.items;
            return this.items.filter(i => i.category_name === this.filterCat);
        },
        get filteredInwardItems() { return this.items; },
        get filteredOrderDeskItems() { return this.items; },
        addInward() {}, 
        deductOutward() {}, 
        addItemToOrder() {}, 
        removeOrderBasketItem() {},
        sendWhatsAppOrder() {}, 
        approveIncomingOrder() {}, 
        declineIncomingOrder() {},
        downloadInwardSupplierReport() {}, 
        downloadExcelReport() {}, 
        purgeItem() {}
    }));
});
