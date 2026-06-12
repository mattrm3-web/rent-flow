import React, { useState, useEffect, useRef } from 'react';
import { useFirebase } from './FirebaseProvider';
import { collection, query, where, getDocs, onSnapshot, addDoc, updateDoc, doc, setDoc, orderBy, serverTimestamp } from 'firebase/firestore';
import { db, storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Send, Phone, Mic, Smile, Check, CheckCheck, MessageSquare, Trash2, ArrowLeft } from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';
import { useLocation, useNavigate } from 'react-router-dom';

export default function Messages() {
  const { userProfile, userRole } = useFirebase();
  const location = useLocation();
  const navigate = useNavigate();
  const [chats, setChats] = useState<any[]>([]);
  const [activeChat, setActiveChat] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [pendingVoiceNote, setPendingVoiceNote] = useState<{blob: Blob, url: string} | null>(null);
  const [isSendingVoiceMode, setIsSendingVoiceMode] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const recordingTimerRef = useRef<any>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);

  // Call states
  const [incomingCall, setIncomingCall] = useState<any>(null);
  const [activeCall, setActiveCall] = useState<any>(null); // { id, peerConnection, localStream, remoteStream }
  const localAudioRef = useRef<HTMLAudioElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Listen for incoming calls
  useEffect(() => {
    if (!userProfile?.uid) return;
    const callsRef = collection(db, 'calls');
    const q = query(callsRef, where('receiverId', '==', userProfile.uid), where('status', '==', 'calling'));
    
    const unsub = onSnapshot(q, (snap) => {
       if (!snap.empty) {
          setIncomingCall({ id: snap.docs[0].id, ...snap.docs[0].data() });
       } else {
          setIncomingCall(null);
       }
    });
    return () => unsub();
  }, [userProfile]);

  // Caller Ringtone Logic
  useEffect(() => {
     let audio: HTMLAudioElement;
     if (activeCall && activeCall.status === 'calling' && activeCall.callerId === userProfile?.uid) {
         audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2864/2864-preview.mp3');
         audio.loop = true;
         audio.play().catch(e => console.log('Audio blocked', e));
     }
     return () => {
         if (audio) { audio.pause(); audio.src = ''; }
     };
  }, [activeCall, userProfile]);

  // Auto-answer incoming call from overlay Navigation
  useEffect(() => {
     const state = location.state as any;
     if (state?.autoAnswerCallId && incomingCall && incomingCall.id === state.autoAnswerCallId) {
        answerCall();
        // Clear the state so it doesn't trigger again on reload
        navigate(location.pathname, { replace: true });
     }
  }, [location.state, incomingCall]);

  // Handle active call signaling (answers & ice candidates)
  useEffect(() => {
    if (!activeCall?.id || !activeCall.peerConnection) return;
    
    const callDoc = doc(db, 'calls', activeCall.id);
    const unsub = onSnapshot(callDoc, async (snapshot) => {
       const data = snapshot.data();
       if (!data) return;

       if (data.status === 'ended') {
          endCall(false);
          return;
       }
       if (data.status === 'missed') {
          if (data.callerId === userProfile?.uid) {
             alert("The call was not answered.");
          }
          endCall(false);
          return;
       }

       const pc = activeCall.peerConnection as RTCPeerConnection;

       if (data.answer && !pc.currentRemoteDescription) {
          const answerDesc = new RTCSessionDescription(data.answer);
          await pc.setRemoteDescription(answerDesc);
       }
    });

    const candidatesQ = collection(db, `calls/${activeCall.id}/candidates`);
    const unsubCand = onSnapshot(candidatesQ, (snapshot) => {
       snapshot.docChanges().forEach(async (change) => {
          if (change.type === 'added') {
             const data = change.doc.data();
             const pc = activeCall.peerConnection as RTCPeerConnection;
             // Don't add your own candidates
             if (data.senderId !== userProfile?.uid) {
                await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
             }
          }
       });
    });

    return () => {
       unsub();
       unsubCand();
    };
  }, [activeCall]);

  const initPeerConnection = async (callId: string) => {
     const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
     if (localAudioRef.current) localAudioRef.current.srcObject = stream;

     const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
     stream.getTracks().forEach(track => pc.addTrack(track, stream));

     pc.onicecandidate = async (event) => {
        if (event.candidate) {
           await addDoc(collection(db, `calls/${callId}/candidates`), {
              candidate: event.candidate.toJSON(),
              senderId: userProfile?.uid
           });
        }
     };

     pc.ontrack = (event) => {
        if (remoteAudioRef.current && event.streams[0]) {
           remoteAudioRef.current.srcObject = event.streams[0];
        }
     };

     return { pc, stream };
  };

  const startVoiceCall = async () => {
     if (!activeChat || activeChat.type === 'group') {
        alert("Voice calls are only supported for direct messages.");
        return;
     }

     try {
        const callDoc = doc(collection(db, 'calls'));
        const { pc, stream } = await initPeerConnection(callDoc.id);
        
        setActiveCall({ id: callDoc.id, peerConnection: pc, localStream: stream, status: 'calling', callerId: userProfile?.uid });

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        await setDoc(callDoc, {
           callerId: userProfile?.uid,
           callerName: userProfile?.name || 'User',
           receiverId: activeChat.participantId,
           offer: { type: offer.type, sdp: offer.sdp },
           status: 'calling',
           timestamp: serverTimestamp()
        });

     } catch(e) {
        console.error(e);
        alert("Failed to start voice call. Check microphone permissions.");
     }
  };

  const answerCall = async () => {
     if (!incomingCall) return;

     try {
        const { pc, stream } = await initPeerConnection(incomingCall.id);
        setActiveCall({ id: incomingCall.id, peerConnection: pc, localStream: stream, status: 'answered', callerId: incomingCall.callerId });
        setIncomingCall(null);

        const offerDesc = new RTCSessionDescription(incomingCall.offer);
        await pc.setRemoteDescription(offerDesc);

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        await updateDoc(doc(db, 'calls', incomingCall.id), {
           answer: { type: answer.type, sdp: answer.sdp },
           status: 'answered'
        });

     } catch(e) {
        console.error("Failed to answer call:", e);
        alert("Failed to answer call. Please allow microphone access.");
     }
  };

  const endCall = async (updateDb = true) => {
     if (activeCall?.peerConnection) {
        activeCall.peerConnection.close();
     }
     if (activeCall?.localStream) {
        activeCall.localStream.getTracks().forEach((track: any) => track.stop());
     }
     if (updateDb && activeCall?.id) {
        await updateDoc(doc(db, 'calls', activeCall.id), { status: 'ended' }).catch(()=>null);
     }
     setActiveCall(null);
     setIncomingCall(null);
  };

  useEffect(() => {
    // 1. Fetch relevant users/groups to form "chats"
    const fetchChats = async () => {
      if (!userProfile?.uid) return;
      
      const chatList: any[] = [];
      const landlordId = (userRole === 'Admin' || userRole === 'Landlord') 
         ? userProfile.uid 
         : userProfile.landlordId || userProfile.uid;

      if (userRole === 'Landlord' || userRole === 'Admin') {
         // View properties (groups)
         const pQ = query(collection(db, 'properties'), where('LandlordID', '==', userProfile.uid));
         const pSnap = await getDocs(pQ);
         const propertiesMap: Record<string, string> = {};
         
         pSnap.docs.forEach(d => {
            propertiesMap[d.id] = d.data().PropertyName;
            chatList.push({
               id: `group_${d.id}`,
               type: 'group',
               name: `${d.data().PropertyName} Group`,
               propertyId: d.id
            });
         });

         // View individual tenants
         const tQ = query(collection(db, 'tenants'), where('LandlordID', '==', userProfile.uid));
         const tSnap = await getDocs(tQ);
         const tenants = tSnap.docs.map(d => ({id: d.id, ...d.data()} as any));
         
         tenants.forEach((t: any) => {
            if (t.AssociatedAuthUid) {
              const propName = propertiesMap[t.PropertyID] || 'Unassigned';
              chatList.push({
                 id: `direct_${[userProfile.uid, t.AssociatedAuthUid].sort().join('_')}`,
                 type: 'direct',
                 name: t.TenantName,
                 propertyLabel: propName,
                 participantId: t.AssociatedAuthUid,
                 participantRef: t
              });
            }
         });

      } else if (userRole === 'Property Manager') {
         // View properties (groups)
         const pQ = query(collection(db, 'properties'), where('PropertyManagerID', '==', userProfile.uid));
         const pSnap = await getDocs(pQ);
         const propertiesMap: Record<string, string> = {};
         const propIds: string[] = [];
         
         pSnap.docs.forEach(d => {
            propertiesMap[d.id] = d.data().PropertyName;
            propIds.push(d.id);
            chatList.push({
               id: `group_${d.id}`,
               type: 'group',
               name: `${d.data().PropertyName} Group`,
               propertyId: d.id
            });
         });

         // View individual tenants
         if (propIds.length > 0) {
            const tQ = query(collection(db, 'tenants'), where('LandlordID', '==', landlordId));
            const tSnap = await getDocs(tQ);
            const tenants = tSnap.docs.map(d => ({id: d.id, ...d.data()} as any));
            
            tenants.forEach((t: any) => {
               if (t.AssociatedAuthUid && propIds.includes(t.PropertyID)) {
                 const propName = propertiesMap[t.PropertyID] || 'Unassigned';
                 chatList.push({
                    id: `direct_${[userProfile.uid, t.AssociatedAuthUid].sort().join('_')}`,
                    type: 'direct',
                    name: t.TenantName,
                    propertyLabel: propName,
                    participantId: t.AssociatedAuthUid,
                    participantRef: t
                 });
               }
            });
         }
      } else if (userRole === 'Tenant') {
         // View landlord
         chatList.push({
            id: `direct_${[landlordId, userProfile.uid].sort().join('_')}`,
            type: 'direct',
            name: 'Landlord',
            participantId: landlordId
         });

         // View property manager (if exists) -> Requires fetching my property
         const myDocs = await getDocs(query(collection(db, 'tenants'), where('AssociatedAuthUid', '==', userProfile.uid)));
         if (!myDocs.empty) {
            const myTenantInfo = myDocs.docs[0].data();
            if (myTenantInfo.PropertyID) {
               chatList.push({
                  id: `group_${myTenantInfo.PropertyID}`,
                  type: 'group',
                  name: `Property Group`,
                  propertyId: myTenantInfo.PropertyID
               });
               
               // Fetch property to get PropertyManagerID
               const propDoc = await getDocs(query(collection(db, 'properties'), where('__name__', '==', myTenantInfo.PropertyID)));
               if (!propDoc.empty) {
                  const pmId = propDoc.docs[0].data().PropertyManagerID;
                  if (pmId) {
                     chatList.push({
                        id: `direct_${[pmId, userProfile.uid].sort().join('_')}`,
                        type: 'direct',
                        name: 'Property Manager',
                        participantId: pmId
                     });
                  }
               }
            }
         }
      }

      setChats(chatList);
    };

    fetchChats();

    // 2. Also listen for dynamic chats where this user is a participant!
    const qDyn = query(collection(db, 'chats'), where('Participants', 'array-contains', userProfile?.uid));
    const unsubChats = onSnapshot(qDyn, snap => {
       const dynChats = snap.docs.map(d => ({id: d.id, ...d.data()} as any));
       setChats(prev => {
          // merge without duplicating
          const safe = [...prev];
          dynChats.forEach(dc => {
             if (!safe.find(s => s.id === dc.id)) {
                safe.push(dc);
             } else {
                // update existing dyn info
                const idx = safe.findIndex(s => s.id === dc.id);
                safe[idx] = dc;
             }
          });
          return safe;
       });
    });

    return () => unsubChats();
  }, [userProfile, userRole]);

  useEffect(() => {
    if (!activeChat) return;

    // Listen to messages
    const q = query(
      collection(db, `chats/${activeChat.id}/messages`),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      setMessages(msgs);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      
      // Update read status for incoming messages
      msgs.forEach((msg: any) => {
         if (msg.senderId !== userProfile?.uid && msg.status !== 'read') {
            updateDoc(doc(db, `chats/${activeChat.id}/messages`, msg.id), { status: 'read' }).catch(()=>{});
         }
      });

      // Clear new message notifications
      getDocs(query(collection(db, 'notifications'), where('userId', '==', userProfile?.uid), where('type', '==', 'message'), where('read', '==', false)))
        .then(snap => {
           snap.docs.forEach(d => {
              updateDoc(doc(db, 'notifications', d.id), { read: true });
           });
        })
        .catch(() => {});
    });

    // Listen to typing indicator
    const typingRef = doc(db, `chats`, activeChat.id);
    const unsubsTyping = onSnapshot(typingRef, (docSnap) => {
       if (docSnap.exists()) {
          const data = docSnap.data();
          const typingMap = data.typing || {};
          let someoneTyping = false;
          Object.keys(typingMap).forEach(key => {
             if (key !== userProfile?.uid && typingMap[key]) {
                someoneTyping = true;
             }
          });
          setOtherTyping(someoneTyping);
       } else {
          setOtherTyping(false);
       }
    });

    return () => {
       unsubscribe();
       unsubsTyping();
    };
  }, [activeChat, userProfile]);

  const updateTypingStatus = async (typing: boolean) => {
     if (!activeChat || !userProfile?.uid) return;
     if (typing === isTyping) return;
     setIsTyping(typing);

     const typingRef = doc(db, `chats`, activeChat.id);
     try {
        await setDoc(typingRef, {
           typing: { [userProfile.uid]: typing }
        }, { merge: true });
     } catch(e) {}
  };

  const dispatchNotification = async (textSnippet: string) => {
    try {
      if (!activeChat) return;
      const receivers: string[] = [];
      if (activeChat.type === 'direct' && activeChat.participantId) {
        receivers.push(activeChat.participantId);
      } else if (activeChat.type === 'group' && activeChat.Participants) {
        receivers.push(...activeChat.Participants.filter((uid: string) => uid !== userProfile?.uid));
      }
      
      const now = new Date().toISOString();
      for (const uid of receivers) {
         await addDoc(collection(db, 'notifications'), {
           userId: uid,
           title: `New Message from ${userProfile?.name || 'User'}`,
           message: textSnippet,
           createdAt: now,
           read: false,
           type: 'message'
         });
      }
    } catch(e) {}
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newMessage.trim() && !audioChunksRef.current.length) return;
    updateTypingStatus(false);

    try {
      const msgRef = collection(db, `chats/${activeChat.id}/messages`);
      await addDoc(msgRef, {
        text: newMessage,
        senderId: userProfile?.uid,
        senderName: userProfile?.name || 'User',
        timestamp: serverTimestamp(),
        type: 'text',
        status: 'sent'
      });
      dispatchNotification(newMessage.substring(0, 50) + (newMessage.length > 50 ? '...' : ''));
      setNewMessage('');
    } catch (err) {
      console.error(err);
    }
  };

  const streamRef = useRef<MediaStream | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      recordingTimerRef.current = setInterval(() => {
         setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Could not start recording", err);
      alert("Microphone access is required to send voice notes. Please unblock it.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      if (recordingTimerRef.current) {
         clearInterval(recordingTimerRef.current);
      }
      mediaRecorderRef.current.onstop = () => {
         const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
         const url = URL.createObjectURL(audioBlob);
         setPendingVoiceNote({ blob: audioBlob, url });
         audioChunksRef.current = [];
      };
      
      mediaRecorderRef.current.stop();
      if (streamRef.current) {
         streamRef.current.getTracks().forEach(track => track.stop());
         streamRef.current = null;
      }
      setIsRecording(false);
      setRecordingTime(0);
    }
  };

  const cancelVoiceNote = () => {
     if (pendingVoiceNote) {
        URL.revokeObjectURL(pendingVoiceNote.url);
     }
     setPendingVoiceNote(null);
  };

  const sendVoiceNote = async () => {
     if (!pendingVoiceNote || !activeChat) return;
     const { blob } = pendingVoiceNote;
     setPendingVoiceNote(null);
     setIsSendingVoiceMode(true);
     
     try {
       const storageRef = ref(storage, `voice_notes/${activeChat.id}/${Date.now()}.webm`);
       await uploadBytes(storageRef, blob);
       const downloadUrl = await getDownloadURL(storageRef);

       const msgRef = collection(db, `chats/${activeChat.id}/messages`);
       await addDoc(msgRef, {
         voiceUrl: downloadUrl,
         senderId: userProfile?.uid,
         senderName: userProfile?.name || 'User',
         timestamp: serverTimestamp(),
         type: 'voice',
         status: 'sent'
       });
       
       dispatchNotification("Sent a voice message 🎤");
     } catch(err) {
       console.error("Failed to process voice note:", err);
       alert("Failed to send voice note. Ensure Storage is configured.");
     } finally {
       setIsSendingVoiceMode(false);
     }
  };

  return (
    <div className="absolute inset-0 flex bg-card sm:border sm:rounded-3xl shadow-sm overflow-hidden md:m-4">
      <audio ref={localAudioRef} autoPlay muted className="hidden" />
      <audio ref={remoteAudioRef} autoPlay className="hidden" />

      {incomingCall && !activeCall && (
         <div className="absolute top-4 right-4 z-50 bg-card border shadow-xl rounded-2xl p-4 flex flex-col items-center animate-in slide-in-from-top-10">
            <div className="bg-emerald-500/20 p-3 rounded-full mb-2 animate-pulse">
               <Phone className="w-6 h-6 text-emerald-500" />
            </div>
            <h4 className="font-bold">{incomingCall.callerName}</h4>
            <p className="text-xs text-muted-foreground mb-4">Incoming voice call...</p>
            <div className="flex gap-2">
               <button onClick={() => { updateDoc(doc(db, 'calls', incomingCall.id), { status: 'ended' }); setIncomingCall(null); }} className="px-4 py-2 bg-rose-500 text-white rounded-xl text-sm font-medium hover:bg-rose-600">Decline</button>
               <button onClick={answerCall} className="px-4 py-2 bg-emerald-500 text-white rounded-xl text-sm font-medium hover:bg-emerald-600">Answer</button>
            </div>
         </div>
      )}

      {activeCall && (
         <div className="absolute top-4 right-4 z-50 bg-zinc-900 border border-zinc-800 shadow-xl rounded-2xl p-4 flex flex-col items-center animate-in slide-in-from-top-10 text-white">
            <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mb-3">
               <Mic className="w-8 h-8 text-emerald-500 animate-pulse" />
            </div>
            <h4 className="font-bold">Voice Call Active</h4>
            <p className="text-xs text-zinc-400 mb-4 text-center">Connected securely</p>
            <button onClick={() => endCall(true)} className="w-full py-2 bg-rose-500 text-white rounded-xl text-sm font-medium hover:bg-rose-600 flex items-center justify-center gap-2">
               <Phone className="w-4 h-4" /> End Call
            </button>
         </div>
      )}

      {/* Sidebar */}
      <div className={`${activeChat ? 'hidden lg:flex' : 'flex'} w-full lg:w-80 border-r flex-col bg-muted/20 shrink-0`}>
        <div className="p-4 border-b bg-card shrink-0">
          <h2 className="text-xl font-bold">Messages</h2>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {chats.map(chat => (
            <button
              key={chat.id}
              onClick={() => setActiveChat(chat)}
              className={`w-full text-left p-3 rounded-xl transition-all ${activeChat?.id === chat.id ? 'bg-emerald-500/10 border-emerald-500/20 shadow-sm border' : 'hover:bg-muted border border-transparent'}`}
            >
              <div className="font-semibold">{chat.name}</div>
              <div className="text-xs text-muted-foreground">{chat.type === 'group' ? 'Property Group' : (chat.propertyLabel ? `Tenant • ${chat.propertyLabel}` : 'Direct Message')}</div>
            </button>
          ))}
          {chats.length === 0 && <div className="text-xs text-center text-muted-foreground mt-4">No chats available</div>}
        </div>
      </div>

      {/* Chat Area */}
      <div className={`${!activeChat ? 'hidden lg:flex' : 'flex'} flex-1 flex-col bg-card relative min-w-0`}>
        {activeChat ? (
          <>
            {/* Header */}
            <div className="p-4 border-b flex items-center justify-between bg-card z-10 shrink-0 shadow-sm">
              <div className="flex items-center gap-3">
                 <button className="lg:hidden p-2 -ml-2 rounded-full hover:bg-muted" onClick={() => setActiveChat(null)}>
                    <ArrowLeft className="w-5 h-5" />
                 </button>
                 <div>
                   <h3 className="font-bold text-lg leading-tight">{activeChat.name}</h3>
                   <p className="text-xs text-emerald-500 font-medium">{activeChat.type === 'group' ? 'Group Chat' : (activeChat.propertyLabel ? `Tenant • ${activeChat.propertyLabel}` : 'Direct Message')}</p>
                 </div>
              </div>
              <div className="flex gap-2">
                {(userRole === 'Landlord' || userRole === 'Admin') && activeChat.type === 'group' && activeChat.id?.startsWith('repair_') && (
                   <button 
                      onClick={() => {
                         const email = prompt("Enter the email or UID of the staff member to add to this chat:");
                         if (email) {
                            alert("This feature would typically look up the staff by email and add them to the Participants array. (Simulation for preview)");
                         }
                      }}
                      className="px-3 py-1.5 text-xs font-semibold bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors mr-2"
                   >
                      Add Staff
                   </button>
                )}
                <button className={`p-2 rounded-full transition-colors ${activeChat.type === 'group' ? 'opacity-50 cursor-not-allowed text-muted-foreground' : 'hover:bg-muted text-primary'}`} title="Voice Call" disabled={activeChat.type === 'group'} onClick={startVoiceCall}>
                  <Phone className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/5 relative">
              {messages.map(msg => {
                 const isMine = msg.senderId === userProfile?.uid;
                 return (
                   <div key={msg.id} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                      <div className="text-[10px] text-muted-foreground mb-1 ml-1">{!isMine ? msg.senderName : ''}</div>
                      <div className={`max-w-[70%] rounded-2xl px-4 py-2 shadow-sm ${isMine ? 'bg-emerald-600 text-white rounded-br-none' : 'bg-white dark:bg-zinc-800 border rounded-bl-none'}`}>
                         {msg.type === 'voice' ? (
                            <audio controls src={msg.voiceUrl} className="h-10 w-[200px]" />
                         ) : (
                            <p className="whitespace-pre-wrap break-words text-[14px] leading-relaxed">{msg.text}</p>
                         )}
                      </div>
                      <div className="flex items-center gap-1 mt-1 mr-1">
                         <span className="text-[10px] text-muted-foreground">
                            {msg.timestamp ? new Date(msg.timestamp.toMillis()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...'}
                         </span>
                         {isMine && msg.type !== 'voice' && (
                            msg.status === 'read' ? <CheckCheck className="w-3 h-3 text-blue-500" /> : <Check className="w-3 h-3 text-muted-foreground" />
                         )}
                      </div>
                   </div>
                 );
              })}
              {otherTyping && (
                 <div className="flex items-center text-xs text-muted-foreground animate-pulse ml-2">
                    typing...
                 </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-3 bg-card border-t shrink-0">
               {isSendingVoiceMode && (
                 <div className="flex justify-center mb-2">
                    <span className="text-xs text-emerald-600 animate-pulse font-medium">Sending voice note...</span>
                 </div>
               )}
               {pendingVoiceNote ? (
                 <div className="flex items-center justify-between gap-3 bg-muted/30 p-2 rounded-2xl w-full">
                    <button type="button" onClick={cancelVoiceNote} className="p-3 text-rose-500 hover:bg-rose-100 rounded-full transition-colors shrink-0">
                       <Trash2 className="w-5 h-5" />
                    </button>
                    <audio src={pendingVoiceNote.url} controls className="h-10 max-w-[250px] flex-1" />
                    <button type="button" onClick={sendVoiceNote} className="p-3 bg-emerald-600 text-white rounded-full hover:bg-emerald-700 transition-all shadow-md shrink-0">
                       <Send className="w-5 h-5" />
                    </button>
                 </div>
               ) : (
              <form onSubmit={handleSendMessage} className="flex items-end gap-2 relative">
                {showEmojiPicker && (
                   <div className="absolute bottom-full mb-2 left-0 z-50 shadow-xl rounded-2xl overflow-hidden border">
                     <EmojiPicker onEmojiClick={(e) => {
                        setNewMessage(prev => prev + e.emoji);
                        setShowEmojiPicker(false);
                     }} />
                   </div>
                )}
                
                <button type="button" onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="p-3 text-muted-foreground hover:text-emerald-500 hover:bg-muted rounded-full transition-all">
                  <Smile className="w-5 h-5" />
                </button>
                
                <textarea
                  value={newMessage}
                  onChange={(e) => {
                     setNewMessage(e.target.value);
                     updateTypingStatus(e.target.value.length > 0);
                  }}
                  onBlur={() => updateTypingStatus(false)}
                  placeholder="Type a message..."
                  className="flex-1 bg-muted/30 border rounded-2xl px-4 py-3 min-h-[44px] max-h-[120px] resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  rows={1}
                  disabled={isRecording}
                  onKeyDown={(e) => {
                     if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                     }
                  }}
                />
                
                {isRecording ? (
                  <button 
                     type="button" 
                     className="p-3 rounded-full transition-all bg-rose-500 text-white animate-pulse shadow-lg"
                     onClick={stopRecording}
                  >
                     <div className="w-5 h-5 flex items-center justify-center">
                        <div className="w-3 h-3 bg-white rounded-sm" />
                     </div>
                  </button>
                ) : newMessage.trim() === '' ? (
                  <button 
                     type="button" 
                     className="p-3 rounded-full transition-all bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                     onClick={startRecording}
                  >
                     <Mic className="w-5 h-5" />
                  </button>
                ) : (
                  <button type="submit" className="p-3 bg-emerald-600 text-white rounded-full hover:bg-emerald-700 transition-all shadow-md">
                     <Send className="w-5 h-5" />
                  </button>
                )}
              </form>
               )}
              {isRecording && (
                 <div className="flex items-center justify-center gap-2 mt-2">
                    <span className="w-2 h-2 bg-rose-500 rounded-full animate-pulse"></span>
                    <p className="text-xs text-rose-500 font-medium">
                       Recording voice note... {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')} (Click stop to preview)
                    </p>
                 </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="flex flex-col items-center gap-3">
              <MessageSquare className="w-12 h-12 opacity-20" />
              <p>Select a chat to start messaging</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
