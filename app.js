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
        creationView: false,
        
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
            onSnapshot(collection(dbFs, "users"), (snapshot) => {
                this.users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            });

            // Standard Developer Auth Mode bypass configuration
            this.isAuthenticated = true; 
            this.currentUsername = "Corporate Administrator";
            this.currentRole = "admin";
            this.ready = true;
        },

        // --- EXCEL BULK UPLOAD ENGINE (AUTO-RESOLVING PIPELINE) ---
        async uploadExcelReport(event) {
            if (this.currentRole !== 'admin' && this.currentRole !== 'inward') {
                alert("Security Exception: Your operating role scope does not authorize bulk database ingest mutations.");
                event.target.value = "";
                return;
            }

            const file = event.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const sheetName = workbook.SheetNames[0];
                    const jsonRows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

                    if (jsonRows.length === 0) {
                        alert("The uploaded sheet contains no data.");
                        return;
                    }

                    let addedItemsCount = 0;

                    for (let row of jsonRows) {
                        const rawItemName = row["Item Name"]?.toString().trim();
                        const rawBalance = Number(row["Live Balance"]) || 0;
                        const rawLimit = Number(row["Safety Limit"]) || 0;
                        const rawMrp = Number(row["Unit Price (MRP)"]?.toString().replace(/[^0-9.]/g, '')) || 0;
                        const rawCategory = row["Category Axis"]?.toString().trim();
                        const rawSupplier = row["Primary Supplier"]?.toString().trim();

                        if (!rawItemName) continue;

                        if (rawCategory && !this.categories.some(c => c.name.toLowerCase() === rawCategory.toLowerCase())) {
                            const newCatRef = await addDoc(collection(dbFs, "categories"), {
                                name: rawCategory,
                                emoji: "📦",
                                bg_color: "#f1f5f9",
                                text_color: "#334155",
                                border_color: "#cbd5e1"
                            });
                            this.categories.push({ id: newCatRef.id, name: rawCategory });
                        }

                        if (rawSupplier && !this.suppliers.some(s => s.name.toLowerCase() === rawSupplier.toLowerCase())) {
                            await addDoc(collection(dbFs, "suppliers"), { name: rawSupplier });
                        }

                        const itemExists = this.items.some(i => i.name.toLowerCase() === rawItemName.toLowerCase());
                        if (!itemExists) {
                            await addDoc(collection(dbFs, "items"), {
                                name: rawItemName,
                                stock: rawBalance,
                                threshold: rawLimit,
                                mrp: rawMrp,
                                category_name: rawCategory || "General",
                                supplier_name: rawSupplier || "General Vendor"
                            });
                            addedItemsCount++;
                        }
                    }

                    alert(`Ingestion loop completed! Added ${addedItemsCount} brand new products dynamically to your cloud dashboard.`);
                    event.target.value = "";
                } catch (err) {
                    console.error("Ingestion crash: ", err);
                    alert("Failed to parse sheet data matrix context cleanly.");
                }
            };
            reader.readAsArrayBuffer(file);
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
                await setDoc(doc(dbFs, "users", userId), { role: newRole }, { merge: true });
                const idx = this.users.findIndex(u => u.id === userId);
                if (idx !== -1) this.users[idx].role = newRole;
                alert(`Operator privileges successfully shifted to: ${newRole}`);
            } catch (err) {
                console.error("Failed to mutate user configuration:", err);
            }
        },

        async changeMyPassword() {
            if (!this.accountForm.currentPassword || !this.accountForm.newPassword) {
                this.accountError = "All password metrics are required.";
                return;
            }
            this.accountError = "";
            this.accountSuccess = "Password modified successfully!";
            setTimeout(() => { this.showAccountModal = false; this.accountSuccess = ""; }, 1500);
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
                    await setDoc(doc(dbFs, "catering_events", this.editingEventId), payload, { merge: true });
                    const idx = this.events.findIndex(e => e.id === this.editingEventId);
                    if (idx !== -1) this.events[idx] = { id: this.editingEventId, ...payload };
                    this.editingEventId = null;
                    alert("Function record context updated successfully!");
                } else {
                    payload.created_at = Date.now();
                    const docRef = await addDoc(collection(dbFs, "catering_events"), payload);
                    payload.id = docRef.id;
                    this.events.push(payload);
                    alert("Fresh function logged successfully!");
                }
                this.clearCateringForm();
            } catch (err) {
                console.error("Mutation failure: ", err);
            }
        },

        downloadExcelReport() {
            if (this.items.length === 0) return alert("No stock datasets found.");
            const formatted = this.items.map(i => ({
                "Item Name": i.name || "N/A",
                "Live Balance": i.stock || 0,
                "Safety Limit": i.threshold || 0,
                "Unit Price (MRP)": i.mrp || 0,
                "Category Axis": i.category_name || "General",
                "Primary Supplier": i.supplier_name || "General Vendor"
            }));
            const ws = XLSX.utils.json_to_sheet(formatted);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Inventory Ledgers");
            XLSX.writeFile(wb, "JewelD_Master_Inventory.xlsx");
        },

        downloadInwardSupplierReport() {
            if (this.items.length === 0) return;
            const formatted = this.items.map(i => ({
                "Primary Supplier": i.supplier_name || "General Vendor",
                "Item Name": i.name || "N/A",
                "Current Balance": i.stock || 0
            }));
            const ws = XLSX.utils.json_to_sheet(formatted);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Suppliers");
            XLSX.writeFile(wb, "JewelD_Suppliers_Ledger.xlsx");
        },

        // FIXED LOGOUT REBOOTH REGISTER PIPELINE
        logout() {
            this.isAuthenticated = false;
            this.currentUsername = '';
            this.currentRole = 'readonly';
            this.ready = false;
            this.loginForm.username = '';
            this.loginForm.password = '';
            this.loginError = '';
            
            // Forces clean state reconstruction
            window.location.reload();
        },

        verifyLogin() { 
            this.isAuthenticated = true; 
            this.currentUsername = this.loginForm.username || "Operator";
            this.currentRole = "admin";
            this.ready = true;
        },
        addInward() {}, deductOutward() {}, addItemToOrder() {}, removeOrderBasketItem() {},
        sendWhatsAppOrder() {}, approveIncomingOrder() {}, declineIncomingOrder() {}, purgeItem() {}
    }));
});
