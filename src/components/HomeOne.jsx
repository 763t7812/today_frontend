'use client'
import React, { useRef, useState, useEffect } from 'react';
import Modal from './UnlockModal';
import home1 from '@/images/home1.png';
import cam from '@/images/camnyt.png';
import video from '@/images/video.png';
import lock from '@/images/lock.png';
import apple from '@/images/apple.png';
import google from '@/images/google.png';
import star from '@/images/star.png';
import setting from '@/images/setting.png';
import male from '@/images/male.png'
import maleIcon from '@/images/maleIcon.png';
import femaleIcon from '@/images/femaleIcon.png';
import coupleIcon from '@/images/coupleIcon.png';
import { Share2, AlignJustify, MoveRight } from 'lucide-react';
import { Emoji, EmojiStyle } from 'emoji-picker-react';
import InputEmoji from "react-input-emoji";
import 'tailwindcss/tailwind.css';
import leftGirlImage from '@/images/leftGirlImage.jpg'
import leftGirl2 from '@/images/leftImage2.jpg'
import googleIcon from '@/images/googleIcon.png'
import fbLogoIcon from '@/images/fbLogoIcon.png'
import Image from 'next/image';

import { Socket, io } from "socket.io-client";

const URL = "https://check2-djcs.onrender.com";
// const URL = "http://localhost:4000";
export default function HomeOne() {

    const [isChecked, setIsChecked] = useState(false);

    const toggleHandler = () => {
        setIsChecked(!isChecked);
    };

    const [Text, setText] = useState("");
    const [isUnlockModalOpen, setIsUnlockModalOpen] = useState(false);

    function handleOnEnter(text) {
        console.log("enter", text);
    }

    const openUnlockModal = () => {
        setIsUnlockModalOpen(true);
    };

    const closeUnlockModal = () => {
        setIsUnlockModalOpen(false);
    };

    const closeModalOnOutsideClick = (e) => {
        if (e.target.classList.contains('modal-overlay')) {
            closeUnlockModal();
        }
    };

    const [showEmailLoginFields, setShowEmailLoginFields] = useState(false);

    const openEmailLoginFields = () => {
        setShowEmailLoginFields(true);
    };

    const [name, setName] = useState("");
    const [localAudioTrack, setLocalAudioTrack] = useState(null);
    const [localVideoTrack, setlocalVideoTrack] = useState(null);
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
    const videoRef = useRef(null);

    const [joined, setJoined] = useState(false);


    const getCam = async () => {
        const stream = await window.navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true
        })
        // MediaStream
        const audioTrack = stream.getAudioTracks()[0]
        const videoTrack = stream.getVideoTracks()[0]
        setLocalAudioTrack(audioTrack);
        setlocalVideoTrack(videoTrack);
        if (!videoRef.current) {
            return;
        }
        videoRef.current.srcObject = new MediaStream([videoTrack])
        videoRef.current.play();
        // MediaStream
    }
    // let pc;


    useEffect(() => {
        const socket = io(URL);
        // setShowVideo(false)
        remoteVideoRef.current && remoteVideoRef.current.pause();
        socket.on("user_disconnected", (data) => {
            console.log(data);
            remoteVideoRef.current && remoteVideoRef.current.pause();

            // Optionally reset other state (if needed):
            // setRemoteMediaStream(null);
            setreffresh(!reffresh)
            setRemoteVideoTrack(null);
            setRemoteAudioTrack(null);
        });


        socket.on('send-offer', async ({ roomId }) => {
            // socket.emit("disconnect_room", { targetSocketId: roomId })
            // socket.emit("connect_room", { targetSocketId: roomId })
            setLobby(false);
            const pc = new RTCPeerConnection();
            setRoomID(roomId);
            setSendingPc(pc);
            if (localVideoTrack) {
                //console.error("added tack");
                //console.log(localVideoTrack)
                pc.addTrack(localVideoTrack)
            }
            if (localAudioTrack) {
                //console.error("added tack");
                //console.log(localAudioTrack)
                pc.addTrack(localAudioTrack)
            }

            pc.onicecandidate = async (e) => {
                //console.log("receiving ice candidate locally");
                if (e.candidate) {
                    socket.emit("add-ice-candidate", {
                        candidate: e.candidate,
                        type: "sender",
                        roomId
                    })
                }
            }

            pc.onnegotiationneeded = async () => {
                //console.log("on negotiation neeeded, sending offer");
                const sdp = await pc.createOffer();
                //@ts-ignore
                pc.setLocalDescription(sdp)
                socket.emit("offer", {
                    sdp,
                    roomId
                })
            }
        });
        socket.on('connection', () => {
            setConversation([])

        });
        socket.on("recv_msg", (data) => {
            setConversation((prevConversation) => [...prevConversation, `Stranger : ${data.msg} `]);
            console.log(data)
        })
        socket.on("offer", async ({ roomId, sdp: remoteSdp }) => {
            //console.log("received offer");
            setLobby(false);
            setRoomID(roomId);
            // socket.emit("disconnect_room", { targetSocketId: roomId })
            socket.emit("connect_room", { targetSocketId: roomId })
            const pc = new RTCPeerConnection();
            pc.setRemoteDescription(remoteSdp)
            const sdp = await pc.createAnswer();
            //@ts-ignore
            pc.setLocalDescription(sdp)
            const stream = new MediaStream();
            if (remoteVideoRef.current) {
                remoteVideoRef.current.play();
                remoteVideoRef.current.srcObject = stream;
            }
            setRemoteMediaStream(stream);
            // trickle ice 
            setReceivingPc(pc);
            window.pcr = pc;
            pc.ontrack = (e) => {
                alert("ontrack");
                // //console.error("inside ontrack");
                // const {track, type} = e;
                // if (type == 'audio') {
                //     // setRemoteAudioTrack(track);
                //     // @ts-ignore
                //     remoteVideoRef.current.srcObject.addTrack(track)
                // } else {
                //     // setRemoteVideoTrack(track);
                //     // @ts-ignore
                //     remoteVideoRef.current.srcObject.addTrack(track)
                // }
                // //@ts-ignore
                // remoteVideoRef.current.play();
            }

            pc.onicecandidate = async (e) => {
                if (!e.candidate) {
                    return;
                }
                //console.log("omn ice candidate on receiving seide");
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
            setRoomID(roomId);

            socket.on('recv_event', (data) => {
                // Broadcast the event to all other users except the sender
                //console.log(data)
                remoteVideoRef.current?.pause()
                setreffresh(!reffresh)
                setShowVideo(false)
                console.log('hi')
                // remoteVideoRef?.current?.play()
            });
            socket.on('Queue_length', data => {
                console.log(data, '<== queu hay ')
                setQueue_length(data)
            })
            setTimeout(() => {
                const track1 = pc.getTransceivers()[0].receiver.track
                const track2 = pc.getTransceivers()[1].receiver.track
                //console.log(track1);
                if (track1.kind === "video") {
                    setRemoteAudioTrack(track2)
                    setRemoteVideoTrack(track1)
                } else {
                    setRemoteAudioTrack(track1)
                    setRemoteVideoTrack(track2)
                }
                //@ts-ignore
                remoteVideoRef.current.srcObject.addTrack(track1)
                //@ts-ignore
                remoteVideoRef.current.srcObject.addTrack(track2)
                //@ts-ignore
                remoteVideoRef.current.play();
                // if (type == 'audio') {
                //     // setRemoteAudioTrack(track);
                //     // @ts-ignore
                //     remoteVideoRef.current.srcObject.addTrack(track)
                // } else {
                //     // setRemoteVideoTrack(track);
                //     // @ts-ignore
                //     remoteVideoRef.current.srcObject.addTrack(track)
                // }
                // //@ts-ignore
            }, 5000)
        });

        socket.on("answer", ({ roomId, sdp }) => {
            setLobby(false);
            setSendingPc(pc => {
                pc?.setRemoteDescription(sdp)
                return pc;
            });
            //console.log("loop closed");
            socket.on("lobby", () => {
                setLobby(true);

                // socket.emit("disconnect_room", { targetSocketId: roomId })
                socket.emit("connect_room", { targetSocketId: roomId })
            })
        })



        socket.on("add-ice-candidate", ({ candidate, type }) => {
            //console.log("add ice candidate from remote");
            //console.log({ candidate, type })
            if (type == "sender") {
                setReceivingPc(pc => {
                    if (!pc) {
                        //console.error("receicng pc nout found")
                    } else {
                        //console.error(pc.ontrack)
                    }
                    pc?.addIceCandidate(candidate)
                    return pc;
                });
            } else {
                setSendingPc(pc => {
                    if (!pc) {
                        //console.error("sending pc nout found")
                    } else {
                        // //console.error(pc.ontrack)
                    }
                    pc?.addIceCandidate(candidate)
                    return pc;
                });
            }
        })

        setSocket(socket)
    }, [name, reffresh, joined])



    useEffect(() => {
        if (localVideoRef.current) {
            if (localVideoTrack) {
                localVideoRef.current.srcObject = new MediaStream([localVideoTrack]);
                localVideoRef.current.play();
            }
        }
    }, [localVideoRef])


    useEffect(() => {
        if (videoRef && videoRef.current) {
            getCam()
        }
    }, [videoRef]);

    // if (!joined) {

    //     return <div>
    //         <video autoPlay ref={videoRef}></video>
    //         <input type="text" onChange={(e) => {
    //             setName(e.target.value);
    //         }}>
    //         </input>
    //         <button onClick={() => {
    //             setJoined(true);
    //         }}>Join</button>
    //     </div>
    // }
    const Next = () => {
        setShowVideo(false)
        if (sendingPc) {
            setreffresh(!reffresh)
            socket?.emit('send_event')
        }
        if (receivingPc) {
            setreffresh(!reffresh)
            socket?.emit('send_event')
        }
        const stream = new MediaStream();
        if (remoteVideoRef.current) {

            remoteVideoRef.current.play();
            remoteVideoRef.current.srcObject = stream;
        }
        socket?.emit('send_event')
        socket?.emit("disconnect_room", { targetSocketId: RoomID })
        // remoteVideoRef?.current&&remoteVideoRef.current.srcObject = null
    };

    console.log({ RoomID })

    const Submit_chat = (e) => {
        // e.preventDefault();
        socket?.emit("msg", { message: Text, targetSocketId: RoomID })
        setConversation((prevConversation) => [...prevConversation, ` ${Text} `]);
        setText("");
    }
    useEffect(() => {
        setShowVideo(true)
    }, [lobby, RoomID])

    console.log(Text)

    const reload_me = () => {
        window.location.reload()
    }
    return (
        <div className='w-full h-full flex  '>
            {joined ?
                (
                    <div className='min-w-[50%] h-full flex flex-col bg-black'>
                        {lobby ? "Waiting to connect you to someone" : null}


                        {ShowVideo && <video className='h-[70%] w-full' ref={remoteVideoRef} />}
                        <div className='min-h-[200px]'>
                            {Queue_length > 0 ?
                                <button className='h-full p-10 text-white bg-slate-400' onClick={() => Next()}>Next</button> :
                                <div className='p-10 h-full text-white bg-slate-400'>
                                    All users are connected!
                                </div>
                            }
                            <button className='h-full text-white  bg-red-500 p-10' onClick={() => reload_me()}>Close Connection</button>
                        </div>
                    </div>
                )
                : (<div className='min-w-[400px] h-full relative'>
                    <Image src={home1} className='relative w-full 2xl:h-[70vh] max-h-[950px] lg:h-[85vh] h-[65vh]  flex justify-center items-center' width={1000} height={1000} alt='' />
                    <div className='text-white absolute top-0 lg:left-14 pr-2 md:left-6 max-w-xl lg:h-[85vh] 2xl:h-[70vh] max-h-[950px] h-[65vh] flex justify-center flex-col gap-6 '>
                        <div className='flex justify-between'>
                            <Image src={cam} width={250} height={200} />
                            <Image src={star} width={50} height={10} />
                        </div>
                        <h4 className=' font-semibold lg:text-2xl text-1xl'>9,851,548 joined Camsurf</h4>
                        <div className='flex gap-2'>
                            <div className="relative">
                                <button
                                    className="bg-pink px-7 flex items-center gap-1 text-white text-sm py-3 bg-gradient-to-b from-[#FF5887] to-[#FF0E52] rounded-3xl"
                                >
                                    I am a male <Image src={maleIcon} alt="maleIcon" width={30} height={30} className="ml-2" />
                                </button>

                            </div>
                            <button onClick={() => setJoined(true)} className='px-20 py-3 bg-gradient-to-b flex text-white text-sm items-center gap-1 from-[#0197F5] to-[#62C2FF] rounded-3xl '>Start <Image src={video} width={10} height={10} /> </button>
                        </div>
                        <button
                            onClick={openUnlockModal}
                            className='px-3 max-w-[330px] py-3 bg-gradient-to-b flex text-white text-xs   items-center gap-1 from-[#525252] to-[#161616]  rounded-3xl text-center  justify-center '
                        >
                            Unlock All Features <Image src={lock} width={10} height={10} />
                        </button>
                        <div className='flex text-sm gap-2'>
                            <div className="flex items-center">
                                <div>
                                    <label htmlFor="toggleB" className="flex items-center cursor-pointer">
                                        {/* toggle */}
                                        <div className="relative">
                                            {/* input */}
                                            <input
                                                type="checkbox"
                                                id="toggleB"
                                                className="sr-only"
                                                checked={isChecked}
                                                onChange={toggleHandler}
                                            />
                                            {/* line */}
                                            <div className="block bg-[#FF5887] w-14 h-8 rounded-full"></div>
                                            {/* dot */}
                                            <div
                                                className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition ${isChecked ? 'transform translate-x-full bg-green-500' : ''
                                                    }`}
                                            ></div>
                                        </div>
                                    </label>
                                </div>
                            </div>
                            <p className='lg:text-base text-sm	'>I certify I have read and agree to the Terms of Use and Cookie Notice. I certify I am at least 18-years old and have reached the age of majority where I live.</p>
                        </div>
                        <div className='flex gap-3'>
                            <Image src={google} width={150} height={100} />
                            <Image src={apple} width={150} height={100} />

                        </div>
                    </div>
                </div>)}
            <div className='w-full h-auto flex flex-col justify-between'>
                <video autoPlay loop className='bg-black w-full  ' ref={videoRef || localVideoRef} />

                <div className='absolute top-0 right-0 p-10 flex gap-6'>
                    <Share2 className='text-white cursor-pointer' />
                    <AlignJustify className='text-white cursor-pointer' />
                </div>
                <div className=' bg-green-300  max-h-[32%] flex flex-col p-5 justify-between overflow-y-auto'>
                    <div className='items-baseline'>
                        <Image src={setting} width={30} height={30} />
                    </div>
                    {/* msg */}
                    <div className='flex flex-col gap-3 h-auto '>
                        {
                            conversation && conversation?.length > 0 ? null : <>
                                <h2 className='underline text-xl text-dark font-semibold'>Report Bugs and Issue
                                </h2>
                                <p> 9,851,548 joined Camsurf <span>Special Offer, Get Plus Today!</span></p>
                            </>
                        }
                        <div className={`flex flex-col  overflow-y-auto `} >
                            {
                                conversation && conversation?.length > 0
                            }
                            {conversation.map((x, index) => (
                                <div key={index} style={{ textAlign: x.includes("Stranger") ? 'left' : 'right' }}>
                                    {x}
                                </div>
                            ))}
                        </div>

                        {/* <form onSubmit={Submit_chat}>
                            <input
                                type="text"
                                style={{ width: "100%" }}
                                onChange={e => setText(e.target.value)}
                            />
                        </form> */}
                        {/* <form onSubmit={Submit_chat} className=''> */}
                        <InputEmoji
                            value={Text}
                            onChange={setText}
                            cleanOnEnter
                            onEnter={Submit_chat}
                            placeholder="Type Your Message Here and Press Enter"
                            style={{ width: '600px' }}  // Adjust the width value as needed
                        />
                        {/* </form> */}
                    </div>
                    {/* <div style={{ width: '100%', height: "400px", backgroundColor: 'gray' }}>
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
                    </div> */}
                </div>
            </div >

            {isUnlockModalOpen && (
                <div
                    className='fixed top-0 left-0 w-full h-full flex items-center justify-center bg-black bg-opacity-50 z-50 modal-overlay'
                    onClick={closeModalOnOutsideClick}
                >
                    <div className='fixed top-0 left-0 w-full h-full flex items-center justify-center bg-black bg-opacity-50 z-50 modal-overlay' onClick={closeModalOnOutsideClick}>
                        <div className='bg-gradient-to-tr from-[#004b86] to-[#368FC7] p-10 rounded-lg shadow-md w-[800px] h-[500px] flex'>
                            <div className="w-1/2 pr-4 h-[400px]">
                                {/* Left side image */}
                                <Image src={leftGirlImage} alt='Left Image' width={300} height={900} className='h-[450px]' objectFit='cover' />
                            </div>

                            <div className="w-1/2 pl-4 flex flex-col justify-center">
                                <div className='flex flex-col text-center justify-center'>
                                    <p className='flex text-white text-center justify-center'>
                                        It’s Easy to Join <p className='font-bold text-xl text-white ml-2 mb-1 pb-1'>CamSurf,</p>
                                    </p>
                                    <p className='font-bold text-3xl text-white mb-4'>Get Started Now</p>
                                </div>
                                <button className='bg-google border border-gray-900 justify-center bg-white text-black text-lg font-bold px-4 py-2 mt-2 flex rounded-xl' onClick={() => alert('Login with Google clicked')}>
                                    <Image src={googleIcon} alt="googleIcon" className='h-8 w-8 mr-4' />Login with Google
                                </button>
                                <button className='bg-facebook border border-gray-900 justify-center bg-white text-black text-lg font-bold px-4 py-2 mt-2 flex rounded-xl' onClick={() => alert('Login with Google clicked')}>
                                    <Image src={fbLogoIcon} alt="googleIcon" className='h-8 w-8 mr-3 ' />Login with Facebook
                                </button>
                                <button onClick={openEmailLoginFields} className='bg-white border border-gray-900 text-black text-lg font-bold px-4 py-2 mt-2 rounded-xl'>
                                    Login with Email
                                </button>
                                {/* Email login fields */}
                                {showEmailLoginFields && (
                                    <div>
                                    </div>
                                )
                                }
                                {/* {showEmailLoginFields && (
                                    <div className="mt-4 shadow-md rounded-md p-4">
                                        <input type="email" placeholder="Email" className="border p-2 rounded-md" />
                                        <input type="password" placeholder="Password" className="border mt-2 p-2 rounded-md" />
                                    </div>
                                )} */}

                                <div className='mt-5'>
                                    <p className='text-white text-center'>10 111 062 joined CamSurf
                                    </p>
                                    <p className='text-white text-center my-6'>Already a Member? Log in Here</p>
                                    <p className='text-white text-center'>By clicking on one of the above options you hereby certify that you have read and agree to the terms of use.</p>
                                </div>
                            </div>
                            <button onClick={closeUnlockModal} className='absolute bg-white top-4 right-4 text-black hover:text-black'>
                                close
                            </button>
                        </div>
                    </div>
                </div>
            )
            }
        </div >
    )
}
