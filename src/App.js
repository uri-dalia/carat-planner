import React, { useState, useEffect } from 'react';
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot, collection, addDoc, deleteDoc, updateDoc, query } from 'firebase/firestore';
// CORRECCIÓN: Se cambió 'lucide-center' por 'lucide-react' para que Vercel compile correctamente
import { Plus, Users, Trash2, Search, CheckCircle, Clock, X, UserCircle, Camera, Sparkles, Loader2, Calendar, AlignLeft, Edit3, UserMinus, Image as ImageIcon } from 'lucide-react';

// --- CONFIGURACIÓN DE FIREBASE DIRECTA ---
const firebaseConfig = {
  apiKey: "AIzaSyC3s5RuTYQFFfVhgtrZ5OniiGqg_KFXdis",
  authDomain: "carat-planner-v3.firebaseapp.com",
  projectId: "carat-planner-v3",
  storageBucket: "carat-planner-v3.firebasestorage.app",
  messagingSenderId: "489311972528",
  appId: "1:489311972528:web:c4bdce10341dd3b23adf75"
};

// Inicialización segura
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);
const db = getFirestore(app);
const appId = "carat-planner-v3"; 
const apiKey_Imagen = ""; 

export default function App() {
  const [user, setUser] = useState(null);
  const [team, setTeam] = useState([]); 
  const [allProfiles, setAllProfiles] = useState([]); 
  const [ideas, setIdeas] = useState([]); 
  const [profile, setProfile] = useState({ name: '', bias: '', photo: '', joinDate: '' });
  
  const [isSetupOpen, setIsSetupOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [isGeneratingPhoto, setIsGeneratingPhoto] = useState(false);

  const [newIdea, setNewIdea] = useState({
    title: '',
    description: '',
    freq: 'No especificado',
    specialFreq: '',
    formats: [],
    owners: []
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);
      } else {
        try {
          await signInAnonymously(auth);
        } catch (err) {
          console.error("Error en auth anónima:", err);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    const profilesColRef = collection(db, 'artifacts', appId, 'public', 'data', 'profiles');
    const unsubProfiles = onSnapshot(profilesColRef, (querySnapshot) => {
      const items = [];
      querySnapshot.forEach((doc) => items.push({ id: doc.id, ...doc.data() }));
      setAllProfiles(items);
    });

    const ideasColRef = collection(db, 'artifacts', appId, 'public', 'data', 'ideas');
    const unsubIdeas = onSnapshot(ideasColRef, (querySnapshot) => {
      const items = [];
      querySnapshot.forEach((doc) => items.push({ id: doc.id, ...doc.data() }));
      setIdeas(items);
    });

    const myProfileDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'profiles', user.uid);
    const unsubMyProfile = onSnapshot(myProfileDocRef, (docSnap) => {
      if (docSnap.exists()) setProfile(docSnap.data());
    });

    return () => {
      unsubProfiles();
      unsubIdeas();
      unsubMyProfile();
    };
  }, [user]);

  const saveProfile = async (updatedProfile) => {
    if (!user) return;
    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'profiles', user.uid), {
      ...updatedProfile,
      uid: user.uid,
      lastUpdate: new Date().toISOString()
    });
    setIsProfileModalOpen(false);
  };

  const deleteProfile = async (profileId) => {
    const confirmDelete = window.confirm("¿Estás segura de que quieres eliminar este perfil de la crew?");
    if (confirmDelete) {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'profiles', profileId));
    }
  };

  const generateProfileImage = async () => {
    if (!profile.bias || !apiKey_Imagen) return;
    setIsGeneratingPhoto(true);
    try {
      const prompt = `A stylish K-pop fan aesthetic profile picture, inspired by Seventeen member ${profile.bias}, soft colors, elegant composition, pastel palette.`;
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${apiKey_Imagen}`, {
        method: 'POST',
        body: JSON.stringify({ instances: { prompt }, parameters: { sampleCount: 1 } })
      });
      const result = await response.json();
      const imageUrl = `data:image/png;base64,${result.predictions[0].bytesBase64Encoded}`;
      setProfile({ ...profile, photo: imageUrl });
    } catch (err) {
      console.error("Error generating image:", err);
    } finally {
      setIsGeneratingPhoto(false);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setProfile({ ...profile, photo: reader.result });
      reader.readAsDataURL(file);
    }
  };

  const handleSaveActivity = async () => {
    if (!newIdea.title) return;
    
    const finalFreq = newIdea.freq === 'Especial' ? (newIdea.specialFreq || 'Especial') : newIdea.freq;
    const data = {
      ...newIdea,
      freq: finalFreq,
      updatedAt: new Date().toISOString()
    };

    if (editingId) {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'ideas', editingId), data);
    } else {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'ideas'), {
        ...data,
        createdAt: new Date().toISOString()
      });
    }
    
    setIsAddModalOpen(false);
    setEditingId(null);
    setNewIdea({ title: '', description: '', freq: 'No especificado', specialFreq: '', formats: [], owners: [] });
  };

  const openEditModal = (activity) => {
    setEditingId(activity.id);
    const isEspecial = !['No especificada', 'Diaria', 'Semanal', 'Mensual'].includes(activity.freq);
    setNewIdea({
      title: activity.title,
      description: activity.description || '',
      freq: isEspecial ? 'Especial' : activity.freq,
      specialFreq: isEspecial ? activity.freq : '',
      formats: activity.formats || [],
      owners: activity.owners || []
    });
    setIsAddModalOpen(true);
  };

  const removeIdea = async (id) => {
    const confirmDelete = window.confirm("¿Eliminar esta actividad definitivamente?");
    if (confirmDelete) {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'ideas', id));
    }
  };

  const filteredIdeas = (ideas || []).filter(idea => {
    const searchLow = searchTerm.toLowerCase();
    const titleMatch = (idea.title || '').toLowerCase().includes(searchLow);
    const descMatch = (idea.description || '').toLowerCase().includes(searchLow);
    const ownersMatch = (idea.owners || []).some(o => o.toLowerCase().includes(searchLow));
    const matchesSearch = titleMatch || descMatch || ownersMatch;
    
    const isAssigned = idea.owners && idea.owners.length > 0;
    const matchesStatus = filterStatus === 'all' || (filterStatus === 'Asignado' && isAssigned) || (filterStatus === 'Pendiente' && !isAssigned);
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-[#F7CAC9] rounded-2xl flex items-center justify-center text-white font-bold text-2xl shadow-lg transform -rotate-3 select-none">17</div>
            <div>
              <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">CARAT Planner</h1>
              <div className="flex items-center gap-2 mt-2">
                <button 
                  onClick={() => setIsSetupOpen(true)}
                  className="text-[10px] font-bold text-[#92A8D1] hover:bg-slate-100 transition-colors flex items-center gap-1.5 bg-white px-2 py-1 rounded-md shadow-sm border border-slate-100 uppercase"
                >
                  <Users size={12} /> My Team
                </button>
                <button 
                  onClick={() => setIsProfileModalOpen(true)}
                  className="text-[10px] font-bold text-[#F7CAC9] hover:bg-slate-100 transition-colors flex items-center gap-1.5 bg-white px-2 py-1 rounded-md shadow-sm border border-slate-100 uppercase"
                >
                  <UserCircle size={12} /> Mi Perfil
                </button>
              </div>
            </div>
          </div>
          
          <button 
            onClick={() => { setEditingId(null); setNewIdea({ title: '', description: '', freq: 'No especificado', specialFreq: '', formats: [], owners: [] }); setIsAddModalOpen(true); }}
            className="bg-[#92A8D1] text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-md hover:scale-105 transition-all"
          >
            <Plus size={20} /> Nueva Actividad
          </button>
        </div>

        {/* Buscador */}
        <div className="bg-white p-4 rounded-2xl mb-6 shadow-sm border border-slate-100 flex flex-wrap gap-4">
          <div className="flex-1 min-w-[260px] relative">
            <Search className="absolute left-3 top-3 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Buscar actividad, descripción o staff..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-transparent rounded-xl focus:border-[#92A8D1] focus:bg-white outline-none transition-all"
            />
          </div>
          <select 
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-slate-50 px-4 py-2 rounded-xl border border-slate-100 outline-none text-slate-600 font-medium"
          >
            <option value="all">Ver todas</option>
            <option value="Asignado">Asignadas</option>
            <option value="Pendiente">Pendientes</option>
          </select>
        </div>

        {/* Tabla */}
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Actividad & Descripción</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Formatos</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Frecuencia</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Staff</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Estado</th>
                  <th className="px-6 py-4 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredIdeas.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-5">
                      <div className="font-bold text-slate-700 leading-tight">{item.title}</div>
                      {item.description && (
                        <div className="text-[11px] text-slate-400 mt-1 line-clamp-1 max-w-[200px]" title={item.description}>
                          {item.description}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex gap-1 flex-wrap">
                        {item.formats?.map(f => (
                          <span key={f} className="text-[9px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded border border-slate-200 font-black uppercase">{f}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span className="text-sm font-semibold text-[#92A8D1] bg-[#92A8D1]/5 px-3 py-1 rounded-full border border-[#92A8D1]/10">
                        {item.freq}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-sm text-slate-500 italic">
                      {item.owners?.length > 0 ? item.owners.join(', ') : 'Sin asignar'}
                    </td>
                    <td className="px-6 py-5">
                      {item.owners?.length > 0 ? (
                        <span className="text-green-500 font-bold text-[10px] uppercase flex items-center gap-1"><CheckCircle size={12}/> Lista</span>
                      ) : (
                        <span className="text-amber-500 font-bold text-[10px] uppercase flex items-center gap-1"><Clock size={12}/> Espera</span>
                      )}
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openEditModal(item)} className="p-2 text-slate-300 hover:text-[#92A8D1] transition-colors"><Edit3 size={16}/></button>
                        <button onClick={() => removeIdea(item.id)} className="p-2 text-slate-300 hover:text-red-400 transition-colors"><Trash2 size={16}/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* --- MODALES --- */}

      {/* Modal My Team */}
      {isSetupOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-50 rounded-[2.5rem] p-8 max-w-4xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-black text-slate-800 tracking-tight">My Team</h2>
                <p className="text-[#F7CAC9] text-[11px] font-black uppercase tracking-[0.2em] mt-1">I love my team, I love my crew</p>
              </div>
              <button onClick={() => setIsSetupOpen(false)} className="bg-white p-2 rounded-full shadow-sm text-slate-400 hover:text-slate-600 transition-colors">
                <X size={24} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
              {allProfiles.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pb-4">
                  {allProfiles.map((p) => (
                    <div key={p.id} className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex flex-col items-center group hover:shadow-md transition-shadow relative">
                      <button 
                        onClick={() => deleteProfile(p.id)}
                        className="absolute top-4 right-4 text-slate-200 hover:text-red-400 transition-colors p-1"
                      >
                        <Trash2 size={14} />
                      </button>
                      <div className="w-24 h-32 bg-slate-50 rounded-xl overflow-hidden mb-4 border-2 border-[#F7CAC9]/30">
                        {p.photo ? (
                          <img src={p.photo} alt={p.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-200">
                            <UserCircle size={40} />
                          </div>
                        )}
                      </div>
                      <h3 className="font-black text-slate-800 text-sm uppercase tracking-tight">{p.name || 'Sin Nombre'}</h3>
                      <div className="mt-2 space-y-1 text-center">
                        <div className="flex items-center justify-center gap-1.5 text-[#92A8D1] text-[10px] font-bold uppercase">
                          <Sparkles size={10} /> Bias: {p.bias || '-'}
                        </div>
                        <div className="flex items-center justify-center gap-1.5 text-slate-400 text-[9px] font-bold uppercase">
                          <Calendar size={10} /> Ingreso: {p.joinDate || '-'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-64 flex flex-col items-center justify-center text-slate-400 italic">
                  <Users size={48} className="mb-4 opacity-20" />
                  <p>Aún no hay perfiles registrados. ¡Sé la primera!</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Editor de Carnet */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[2.5rem] p-8 max-sm w-full shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-r from-[#F7CAC9] to-[#92A8D1] opacity-20"></div>
            <div className="relative z-10 flex flex-col items-center">
              <div className="flex justify-between w-full items-start mb-6">
                <div className="bg-slate-800 text-white px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase">ID Card Editor</div>
                <button onClick={() => setIsProfileModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
              </div>
              <div className="relative group mb-6">
                <div className="w-32 h-40 bg-slate-100 rounded-2xl overflow-hidden border-4 border-white shadow-xl relative">
                  {profile.photo ? (
                    <img src={profile.photo} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
                      <UserCircle size={48} />
                      <p className="text-[10px] mt-2 font-bold uppercase tracking-widest">Sin Foto</p>
                    </div>
                  )}
                </div>
                <div className="absolute -bottom-2 -right-2 flex gap-1">
                  <label className="bg-[#92A8D1] text-white p-2 rounded-full cursor-pointer shadow-md hover:scale-110 transition-all">
                    <ImageIcon size={14} />
                    <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
                  </label>
                </div>
              </div>
              <div className="w-full space-y-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Nombre Colaboradora</label>
                  <input 
                    value={profile.name} onChange={(e) => setProfile({...profile, name: e.target.value})}
                    placeholder="Tu nombre aquí..."
                    className="w-full bg-slate-50 p-2 rounded-lg border border-slate-100 outline-none text-center font-bold text-slate-700 focus:border-[#F7CAC9]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Bias</label>
                    <input 
                      value={profile.bias} onChange={(e) => setProfile({...profile, bias: e.target.value})}
                      placeholder="Bias..."
                      className="w-full bg-slate-50 p-2 rounded-lg border border-slate-100 outline-none text-center font-bold text-slate-700 focus:border-[#92A8D1]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Ingreso</label>
                    <input 
                      value={profile.joinDate} onChange={(e) => setProfile({...profile, joinDate: e.target.value})}
                      placeholder="DD/MM/AA"
                      className="w-full bg-slate-50 p-2 rounded-lg border border-slate-100 outline-none text-center font-bold text-slate-700 focus:border-[#92A8D1]"
                    />
                  </div>
                </div>
              </div>
              <button 
                onClick={() => saveProfile(profile)}
                className="w-full mt-8 bg-slate-800 text-white py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-700 shadow-lg"
              >
                Actualizar Mi Carnet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Actividad */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[2.5rem] p-8 max-w-xl w-full shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-black text-slate-800">{editingId ? 'Editar Actividad' : 'Nueva Actividad'}</h2>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">
                  {editingId ? 'Modifica los detalles de la tarea' : 'Propón una nueva tarea para el equipo'}
                </p>
              </div>
              <button onClick={() => { setIsAddModalOpen(false); setEditingId(null); }} className="bg-slate-50 p-2 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Título de la Actividad</label>
                <input 
                  value={newIdea.title} 
                  onChange={(e) => setNewIdea({...newIdea, title: e.target.value})}
                  placeholder="Ej: Cobertura del concierto en vivo..."
                  className="w-full bg-slate-50 p-4 rounded-2xl border border-slate-100 outline-none focus:border-[#92A8D1] focus:bg-white transition-all font-bold"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1">
                  <AlignLeft size={10}/> Descripción de la tarea
                </label>
                <textarea 
                  value={newIdea.description} 
                  onChange={(e) => setNewIdea({...newIdea, description: e.target.value})}
                  placeholder="Detalla de qué trata esta actividad..."
                  rows={3}
                  className="w-full bg-slate-50 p-4 rounded-2xl border border-slate-100 outline-none focus:border-[#92A8D1] focus:bg-white transition-all text-sm resize-none"
                />
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Frecuencia</label>
                <div className="flex flex-wrap gap-2">
                  {['No especificada', 'Diaria', 'Semanal', 'Mensual', 'Especial'].map(f => (
                    <button 
                      key={f}
                      type="button"
                      onClick={() => setNewIdea({...newIdea, freq: f})}
                      className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${newIdea.freq === f ? 'bg-[#92A8D1] text-white border-[#92A8D1] shadow-md' : 'bg-white text-slate-500 border-slate-100 hover:border-[#92A8D1]'}`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
                
                {newIdea.freq === 'Especial' && (
                  <div className="animate-in slide-in-from-top-2 duration-300">
                    <input 
                      value={newIdea.specialFreq} 
                      onChange={(e) => setNewIdea({...newIdea, specialFreq: e.target.value.substring(0, 30)})}
                      placeholder="Define tu frecuencia personalizada..."
                      className="w-full bg-[#F7CAC9]/10 p-3 rounded-xl border border-[#F7CAC9]/30 outline-none text-xs font-bold text-[#F7CAC9] placeholder-[#F7CAC9]/50"
                    />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Formatos de entrega</label>
                <div className="flex flex-wrap gap-2">
                  {['Post', 'Story', 'Reel', 'TikTok', 'YouTube'].map(f => (
                    <button 
                      key={f} type="button" onClick={() => setNewIdea(p => ({...p, formats: p.formats.includes(f) ? p.formats.filter(x => x!==f) : [...p.formats, f]}))}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-black border transition-all uppercase tracking-wider ${newIdea.formats.includes(f) ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-400 border-slate-100'}`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center px-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Staff Asignado (Múltiple)</label>
                  <button 
                    type="button"
                    onClick={() => setNewIdea(p => ({...p, owners: []}))}
                    className="flex items-center gap-1 text-[9px] font-black text-amber-500 uppercase hover:underline"
                  >
                    <UserMinus size={10} /> No asignado
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                  {allProfiles.map(p => (
                    <button 
                      key={p.id} 
                      type="button"
                      onClick={() => setNewIdea(prev => ({
                        ...prev, 
                        owners: prev.owners.includes(p.name) 
                          ? prev.owners.filter(x => x !== p.name) 
                          : [...prev.owners, p.name]
                      }))}
                      className={`px-3 py-2 rounded-xl text-[10px] truncate font-bold border transition-all text-left flex items-center gap-2 ${newIdea.owners.includes(p.name) ? 'bg-[#F7CAC9] text-white border-[#F7CAC9] shadow-sm' : 'bg-white text-slate-400 border-slate-100 hover:border-[#F7CAC9]'}`}
                    >
                      <div className={`w-1.5 h-1.5 rounded-full ${newIdea.owners.includes(p.name) ? 'bg-white' : 'bg-slate-200'}`}></div>
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>

              <button 
                onClick={handleSaveActivity} 
                className="w-full bg-slate-800 text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl hover:bg-slate-700 hover:-translate-y-1 transition-all active:scale-95"
              >
                {editingId ? 'Guardar Cambios 💎' : 'Publicar Actividad 💎'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
