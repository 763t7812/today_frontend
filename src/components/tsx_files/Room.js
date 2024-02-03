import { useEffect, useRef, useState } from "react";
import { Socket, io } from "socket.io-client";

const URL = "http://localhost:4000";

export default function Room({
    name,
    localAudioTrack,
    localVideoTrack
}) {
    const [lobby, setLobby] = useState(true);
    const [Queue_length, setQueue_length] = useState(0);
    const [reffresh, setreffresh] = useState(true);
    const [ShowVideo, setShowVideo] = useState(true);
    const [msgs, setmsgs] = useState('');
    const [RoomID, setRoomID] = useState(null);
    const [conversation, setConversation] = useState([]);
    const [typing, settyping] = useState(true);
    const [socket, setSocket] = useState(null);
    const [sendingPc, setSendingPc] = useState(null);
    const [receivingPc, setReceivingPc] = useState(null);
    const [remoteVideoTrack, setRemoteVideoTrack] = useState(null);
    const [remoteAudioTrack, setRemoteAudioTrack] = useState(null);
    const [remoteMediaStream, setRemoteMediaStream] = useState(null);
    const remoteVideoRef = useRef();
    const localVideoRef = useRef();

    useEffect(() => {
        const socket = io(URL);

        remoteVideoRef?.current && remoteVideoRef?.current?.pause();
        socket.on("user_disconnected", (data) => {
            console.log(data);
            remoteVideoRef.current && remoteVideoRef.current.pause();
            setRemoteVideoTrack(null);
            setRemoteAudioTrack(null);
        });

        socket.on('send-offer', async ({ roomId }) => {
            setLobby(false);
            const pc = new RTCPeerConnection();
            setRoomID(roomId);
            setSendingPc(pc);

            pc.onicecandidate = async (e) => {
                if (e.candidate) {
                    socket.emit("add-ice-candidate", {
                        candidate: e.candidate,
                        type: "sender",
                        roomId
                    });
                }
            };

            pc.onnegotiationneeded = async () => {
                try {
                    const sdp = await pc.createOffer();
                    await pc.setLocalDescription(sdp);
                    socket.emit("offer", {
                        sdp,
                        roomId
                    });
                } catch (err) {
                    console.error("Error creating or setting local offer:", err);
                }
            };
        });

        socket.on("offer", async ({ roomId, sdp: remoteSdp }) => {
            setLobby(false);
            setRoomID(roomId);
            socket.emit("connect_room", { targetSocketId: roomId })
            const pc = new RTCPeerConnection();
            pc.setRemoteDescription(remoteSdp)
            const sdp = await pc.createAnswer();
            pc.setLocalDescription(sdp)
            const stream = new MediaStream();
            if (remoteVideoRef.current) {
                remoteVideoRef.current.play();
                remoteVideoRef.current.srcObject = stream;
            }
            setRemoteMediaStream(stream);
            setReceivingPc(pc);
            
            pc.ontrack = (e) => {
                alert("ontrack");
            }

            pc.onicecandidate = async (e) => {
                if (e.candidate) {
                    socket.emit("add-ice-candidate", {
                        candidate: e.candidate,
                        type: "receiver",
                        roomId
                    })
                }
            }

            socket.emit("answer", {
                roomId,
                sdp: sdp
            });

            socket.on('recv_event', (data) => {
                remoteVideoRef.current?.pause()
                setreffresh(!reffresh)
                setShowVideo(false)
            });

            socket.on('Queue_length', data => {
                setQueue_length(data)
            })

            setTimeout(() => {
                const track1 = pc.getTransceivers()[0].receiver.track
                const track2 = pc.getTransceivers()[1].receiver.track
                if (track1.kind === "video") {
                    setRemoteAudioTrack(track2)
                    setRemoteVideoTrack(track1)
                } else {
                    setRemoteAudioTrack(track1)
                    setRemoteVideoTrack(track2)
                }
                
                remoteVideoRef.current.srcObject.addTrack(track1)
                remoteVideoRef.current.srcObject.addTrack(track2)
                remoteVideoRef.current.play();
            }, 5000)
        });

        socket.on("answer", ({ roomId, sdp: remoteSdp }) => {
            setLobby(false);
            setSendingPc(pc => {
                pc?.setRemoteDescription(remoteSdp)
                return pc;
            });

            socket.on("lobby", () => {
                setLobby(true);
                socket.emit("connect_room", { targetSocketId: roomId })
            })
        })

        socket.on("add-ice-candidate", ({ candidate, type }) => {
            if (type == "sender") {
                setReceivingPc(pc => {
                    pc?.addIceCandidate(candidate)
                    return pc;
                });
            } else {
                setSendingPc(pc => {
                    pc?.addIceCandidate(candidate)
                    return pc;
                });
            }
        })

        setSocket(socket);
    }, [name, reffresh]);

    useEffect(() => {
        if (localVideoRef.current) {
            if (localVideoTrack) {
                localVideoRef.current.srcObject = new MediaStream([localVideoTrack]);
                localVideoRef.current.play();
            }
        }
    }, [localVideoRef])

    const Next = () => {
        setShowVideo(false);
        if (sendingPc) {
            setreffresh(!reffresh);
            socket?.emit('send_event');
        }
        if (receivingPc) {
            setreffresh(!reffresh);
            socket?.emit('send_event');
        }
        const stream = new MediaStream();
        if (remoteVideoRef.current) {
            remoteVideoRef.current.play();
            remoteVideoRef.current.srcObject = stream;
        }
        socket?.emit('send_event');
        socket?.emit("disconnect_room", { targetSocketId: RoomID });
    };

    const Submit_chat = (e) => {
        e.preventDefault();
        socket?.emit("msg", { message: msgs, targetSocketId: RoomID })
        setConversation((prevConversation) => [...prevConversation, ` ${msgs} `]);
        setmsgs("");
    }

    useEffect(() => {
        setShowVideo(true)
    }, [lobby, RoomID])

    return (
        <div>
            Hi {name}
            {Queue_length > 0 ? (
                <button onClick={() => Next()}>Next</button>
            ) : (
                "All users are connected!"
            )}
            <video autoPlay width={400} height={400} ref={localVideoRef} />
            {lobby ? "Waiting to connect you to someone" : null}
             <video width={400} height={400} ref={remoteVideoRef} />

            <div style={{ width: '100%', height: "400px", backgroundColor: 'gray' }}>
                <div style={{ width: "100%", height: "90%", backgroundColor: "lightgrey" }}>
                    {conversation.map((x, index) => (
                        <div key={index} style={{ textAlign: x.includes("Stranger") ? 'left' : 'right' }}>
                            {x}
                        </div>
                    ))}
                </div>
                <div style={{ width: "100%", height: "10%", backgroundColor: "lightslategray" }}>
                    <form onSubmit={Submit_chat}>
                        <input
                            type="text"
                            style={{ width: "100%" }}
                            onChange={e => setmsgs(e.target.value)}
                        />
                    </form>
                </div>
            </div>
        </div>
    );
}
