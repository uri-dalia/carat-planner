import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot, collection, addDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { Plus, Users, Trash2, Search, CheckCircle, Clock, X, UserCircle, Image as ImageIcon, Edit3, AlignLeft, Calendar } from 'lucide-react';

// 1. CONFIGURACIÓN DE TU FIREBASE
const firebaseConfig = {
  apiKey: "AIzaSyC3s5RuTYQFFfVhgtrZ5OniiGqg_KFXdis",
  authDomain: "carat-planner-v3.firebaseapp.com",
  projectId: "carat-planner-v3",
  storageBucket: "carat-planner-v3.firebasestorage.app",
  messagingSenderId: "489311972528",
  appId: "1:489311972528:web:c4bdce10341dd3b23adf75"
};

// 2. INICIALIZACIÓN DE SERVICIOS
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export default function App() {
  const [user, setUser] = useState(null);
  const [allProfiles, setAllProfiles] = useState([]); 
  const [ideas, setIdeas] = useState([]); 
  const [profile, setProfile] = useState({ name: '', bias: '', photo: '', joinDate: '' });
  
  // Estados de Modales
  const [isSetupOpen, setIsSetupOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  // Buscador y Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // Estado Nueva Actividad
  const [newIdea, setNewIdea] = useState({
    title: '',
    description: '',
    freq: 'No especificada',
    owners: []
  });

  // 3. AUTENTICACIÓN AUTOMÁTICA
  useEffect(() => {
    signInAnonymously(auth).catch((err) => console.error("Error de Auth:", err));
    const unsubscribe = onAuthStateChanged(auth, (u) => { 
      if (u) setUser(u); 
    });
    return () => unsubscribe();
  }, []);

  // 4. ESCUCHA DE DATOS EN TIEMPO REAL
  useEffect(() => {
    if (!user) return;

    // Escuchar todos los perfiles de la crew
    const unsubProfiles = onSnapshot(collection(db, 'profiles'), (snap) => {
      const items = [];
      snap.forEach((doc) => items.push({ id: doc.id, ...doc.data() }));
      setAllProfiles(items);
    });

    // Escuchar todas las actividades
    const unsubIdeas = onSnapshot(collection(db, 'ideas'), (snap) => {
      const items = [];
      snap.forEach((doc) => items.push({ id: doc.id, ...doc.data() }));
      setIdeas(items);
    });

    // Escuchar mi perfil actual
    const unsubMyProfile = onSnapshot(doc(db, 'profiles', user.uid), (docSnap) => {
      if (docSnap.exists()) setProfile(docSnap.data());
    });

    return () => { unsubProfiles(); unsubIdeas(); unsubMyProfile(); };
  }, [user]);

  // --- FUNCIONES / ACCIONES ---

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setProfile({ ...profile, photo: reader.result });
      reader.readAsDataURL(file);
    }
  };

  const saveProfile = async () => {
    if (!user) return;
    try {
      await setDoc(doc(db, 'profiles', user.uid), {
        ...profile,
        uid: user.uid,
        lastUpdate: new Date().toISOString()
      });
      setIsProfileModalOpen(false);
    } catch (err) { alert("Error al guardar perfil"); }
  };

  const handleSaveActivity = async () => {
    if (!user || !newIdea.title) return;
    const data = { ...newIdea, updatedAt: new Date().toISOString() };

    try {
      if (editingId) {
        await updateDoc(doc(db, 'ideas', editingId), data);
      } else {
        await addDoc(collection(db, 'ideas'), { ...data, createdAt: new Date().toISOString() });
      }
      setIsAddModalOpen(false);
      setEditingId(null);
      setNewIdea({ title: '', description: '', freq: 'No especificada', owners: [] });
    } catch (err) { console.error(err); }
  };

  const filteredIdeas = ideas.filter(idea => {
    const matchesSearch = (idea.title || '').toLowerCase().includes(searchTerm.toLowerCase());
    const isAssigned = idea.owners && idea.owners.length > 0;
    const matchesStatus = filterStatus === 'all' || (filterStatus === 'Asignado' && isAssigned) || (filterStatus === 'Pendiente' && !isAssigned);
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 md:p-8 font-sans text-slate-900">
      <div className="max-w-6xl mx-auto">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-[#F7CAC9] rounded-2xl flex items-center justify-center text-white font-bold text-2xl shadow-lg transform -rotate-3">17</div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-slate-800">CARAT Planner</h1>
              <div className="flex gap-2 mt-2">
                <button onClick={() => setIsSetupOpen(true)} className="text-[10px] font-bold text-[#92A8D1] bg-white px-3 py-1.5 rounded-lg shadow-sm border border-slate-100 flex items-center gap-1 uppercase hover:bg-slate-50 transition-all">
                  <Users size={12} /> Crew
                </button>
                <button onClick={() => setIsProfileModalOpen(true)} className="text-[10px] font-bold text-[#F7CAC9] bg-white px-3 py-1.5 rounded-lg shadow-sm border border-slate-100 flex items-center gap-1 uppercase hover:bg-slate-50 transition-all">
                  <UserCircle size={12} /> Mi Perfil
                </button>
              </div>
            </div>
          </div>
          <button onClick={() => { setEditingId(null); setIsAddModalOpen(true); }} className="bg-[#92A8D1] text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg hover:scale-105 transition-all active:scale-95">
            <Plus size={20} /> Nueva Actividad
          </button>
        </div>

        {/* BUSCADOR */}
        <div className="bg-white p-4 rounded-2xl mb-6 shadow-sm border border-slate-100 flex flex-wrap gap-4">
          <div className="flex-1 min-w-[260px] relative">
            <Search className="absolute left-3 top-3 text-slate-400" size={18} />
            <input type="text" placeholder="Buscar actividad..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-[#92A8D1]/20 outline-none transition-all" />
          </div>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="bg-slate-50 px-4 py-2 rounded-xl border-none outline-none font-bold text-slate-600">
            <option value="all">Todos los planes</option>
            <option value="Asignado">Asignados</option>
            <option value="Pendiente">Pendientes</option>
          </select>
        </div>

        {/* TABLA PRINCIPAL */}
        <div className="bg-white rounded-[2rem] shadow-xl overflow-hidden border border-slate-100">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">Actividad</th>
                  <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">Staff</th>
                  <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">Estado</th>
                  <th className="px-6 py-5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredIdeas.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/30 transition-colors group">
                    <td className="px-6 py-5">
                      <div className="font-bold text-slate-700 text-lg">{item.title}</div>
                      <div className="text-xs text-slate-400 mt-1 flex items-center gap-1"><AlignLeft size={12}/> {item.description || 'Sin descripción'}</div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-wrap gap-1">
                        {item.owners?.length > 0 ? item.owners.map(o => (
                          <span key={o} className="bg-blue-50 text-[#92A8D1] text-[10px] font-bold px-2 py-0.5 rounded-md border border-blue-100">{o}</span>
                        )) : <span className="text-slate-300 italic text-xs">Sin asignar</span>}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      {item.owners?.length > 0 ? 
                        <span className="text-green-500 font-black text-[10px] uppercase flex items-center gap-1.5"><CheckCircle size={14}/> Listo</span> : 
                        <span className="text-amber-500 font-black text-[10px] uppercase flex items-center gap-1.5"><Clock size={14}/> Pendiente</span>
                      }
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => { setEditingId(item.id); setNewIdea(item); setIsAddModalOpen(true); }} className="p-2 text-slate-300 hover:text-[#92A8D1] transition-colors"><Edit3 size={18}/></button>
                        <button onClick={async () => { if(window.confirm("¿Eliminar este plan?")) await deleteDoc(doc(db, 'ideas', item.id)) }} className="p-2 text-slate-300 hover:text-red-400 transition-colors"><Trash2 size={18}/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredIdeas.length === 0 && (
              <div className="p-20 text-center text-slate-300 font-bold italic">No hay actividades aún...</div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL: MI PERFIL (GALERÍA ACTIVADA) */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[3rem] p-10 max-w-sm w-full shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#F7CAC9] to-[#92A8D1]"></div>
            <div className="flex justify-between items-center mb-8">
               <h2 className="font-black uppercase text-xs tracking-[0.2em] text-slate-400">ID Editor</h2>
               <button onClick={() => setIsProfileModalOpen(false)} className="text-slate-300 hover:text-slate-600"><X size={24}/></button>
            </div>
            <div className="flex flex-col items-center gap-6">
               <div className="relative group">
                  <div className="w-36 h-48 bg-slate-50 rounded-[2rem] overflow-hidden border-4 border-white shadow-2xl flex items-center justify-center relative">
                    {profile.photo ? <img src={profile.photo} alt="PFP" className="w-full h-full object-cover" /> : <UserCircle size={60} className="text-slate-200" />}
                    <label className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                      <ImageIcon className="text-white" size={32} />
                      <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
                    </label>
                  </div>
                  <div className="absolute -bottom-2 -right-2 bg-white p-2 rounded-full shadow-lg text-[#92A8D1]">
                    <ImageIcon size={20} />
                  </div>
               </div>
               <div className="w-full space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Nombre</label>
                    <input value={profile.name} onChange={(e) => setProfile({...profile, name: e.target.value})} placeholder="Carat Name" className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-bold text-slate-700 focus:bg-white border-2 border-transparent focus:border-[#F7CAC9] transition-all" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Bias</label>
                    <input value={profile.bias} onChange={(e) => setProfile({...profile, bias: e.target.value})} placeholder="Tu Bias favorito" className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-bold text-slate-700 focus:bg-white border-2 border-transparent focus:border-[#92A8D1] transition-all" />
                  </div>
               </div>
               <button onClick={saveProfile} className="w-full bg-slate-800 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-slate-700 transition-all">Guardar Carnet 💎</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: MY TEAM */}
      {isSetupOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-50 rounded-[2.5rem] p-8 max-w-4xl w-full max-h-[85vh] overflow-hidden flex flex-col shadow-2xl border border-white">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-3xl font-black text-slate-800">My Crew</h2>
              <button onClick={() => setIsSetupOpen(false)} className="bg-white p-2 rounded-full shadow-sm text-slate-400 hover:text-slate-600"><X size={24} /></button>
            </div>
            <div className="overflow-y-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pr-2">
              {allProfiles.map(p => (
                <div key={p.id} className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col items-center relative group">
                   <div className="w-24 h-32 bg-slate-50 rounded-2xl overflow-hidden mb-4 border-2 border-[#F7CAC9]/20 shadow-inner">
                    {p.photo ? <img src={p.photo} alt="PFP" className="w-full h-full object-cover" /> : <UserCircle size={40} className="m-auto mt-8 text-slate-200" />}
                   </div>
                   <h3 className="font-black text-slate-800 text-sm uppercase tracking-tight">{p.name || 'Sin Nombre'}</h3>
                   <div className="text-[#92A8D1] text-[10px] font-bold uppercase mt-1 flex items-center gap-1">💎 Bias: {p.bias || '-'}</div>
                   <button onClick={async () => { if(window.confirm("¿Eliminar perfil?")) await deleteDoc(doc(db, 'profiles', p.id)) }} className="absolute top-4 right-4 text-slate-200 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={16}/></button>
                </div>
              ))}
              {allProfiles.length === 0 && <p className="col-span-full text-center text-slate-300 py-10 font-bold italic">No hay miembros registrados todavía.</p>}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: NUEVA ACTIVIDAD */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[2.5rem] p-8 max-w-xl w-full shadow-2xl">
             <div className="flex justify-between items-center mb-8">
                <div>
                  <h2 className="text-2xl font-black text-slate-800">{editingId ? 'Editar' : 'Nueva'} Actividad</h2>
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Planifica el siguiente paso</p>
                </div>
                <button onClick={() => setIsAddModalOpen(false)} className="text-slate-300 hover:text-slate-600 transition-colors"><X size={28}/></button>
             </div>
             <div className="space-y-6">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Título de la actividad</label>
                  <input value={newIdea.title} onChange={(e) => setNewIdea({...newIdea, title: e.target.value})} placeholder="Ej: Stream Party de Seventeen" className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-bold text-slate-700 border-2 border-transparent focus:border-[#92A8D1] focus:bg-white transition-all" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Descripción (opcional)</label>
                  <textarea value={newIdea.description} onChange={(e) => setNewIdea({...newIdea, description: e.target.value})} placeholder="Detalles extra..." className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-medium text-slate-600 border-2 border-transparent focus:border-[#92A8D1] focus:bg-white h-24 transition-all resize-none" />
                </div>
                <div className="space-y-3">
                  <p className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Asignar Staff:</p>
                  <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto pr-2">
                    {allProfiles.map(p => (
                      <button key={p.id} onClick={() => setNewIdea(prev => ({...prev, owners: prev.owners.includes(p.name) ? prev.owners.filter(x => x!==p.name) : [...prev.owners, p.name]}))} className={`px-4 py-2.5 rounded-xl text-[10px] font-bold border-2 transition-all ${newIdea.owners.includes(p.name) ? 'bg-[#F7CAC9] border-[#F7CAC9] text-white shadow-md' : 'bg-white border-slate-100 text-slate-400 hover:border-[#F7CAC9]/30'}`}>
                        {p.name}
                      </button>
                    ))}
                    {allProfiles.length === 0 && <p className="text-[10px] text-slate-300 italic">Primero crea tu perfil para asignarte tareas.</p>}
                  </div>
                </div>
                <button onClick={handleSaveActivity} className="w-full bg-slate-800 text-white py-5 rounded-[1.5rem] font-black uppercase tracking-widest shadow-2xl hover:bg-slate-700 hover:-translate-y-1 transition-all active:scale-95">
                  {editingId ? 'Actualizar 💎' : 'Publicar Plan 💎'}
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
