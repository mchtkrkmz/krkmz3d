import React, { useEffect, useRef } from 'react';
import { CardTableScene } from '../xr/threeScene';
import { WebXRManager } from '../xr/webxrManager';
import { Card, RoomPlayer, Suit } from '../types';

interface VRCanvasProps {
  playerHand: Card[];
  middleCards: Card[];
  players: RoomPlayer[];
  currentTurnSeat: number;
  localSeatIndex: number;
  trumpSuit?: Suit | 'none';
  onCardPlayRequested: (card: Card) => void;
  onXRManagerReady?: (xrManager: WebXRManager) => void;
  onTelemetrySample?: (sample: {
    pinchCount: number;
    hapticCount: number;
    leftWrist?: [number, number, number];
    rightWrist?: [number, number, number];
  }) => void;
}

export const VRCanvas: React.FC<VRCanvasProps> = ({
  playerHand,
  middleCards,
  players,
  currentTurnSeat,
  localSeatIndex,
  trumpSuit,
  onCardPlayRequested,
  onXRManagerReady,
  onTelemetrySample,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<CardTableScene | null>(null);
  const xrManagerRef = useRef<WebXRManager | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Initialize 3D scene
    const scene = new CardTableScene(containerRef.current);
    sceneRef.current = scene;

    scene.onCardPlayRequested = (card) => {
      onCardPlayRequested(card);
    };

    // Initialize WebXR Manager for Meta Quest 3 Hand Tracking
    const xrManager = new WebXRManager(scene.renderer, {
      onPinchCard: (hand, position, isPinching) => {
        scene.handleXRPinch(hand, position, isPinching);
      },
      onTelemetrySample: (data) => {
        if (onTelemetrySample) {
          onTelemetrySample(data);
        }
      },
    });
    xrManagerRef.current = xrManager;

    if (onXRManagerReady) {
      onXRManagerReady(xrManager);
    }

    // Animation loop using renderer.setAnimationLoop (mandatory for WebXR)
    scene.renderer.setAnimationLoop((time, frame) => {
      if (frame && xrManager) {
        xrManager.updateXRFrame(frame, time);
        const lPose = xrManager.getLeftHandPose();
        const rPose = xrManager.getRightHandPose();
        scene.updateXRHandPoses(lPose.wrist, lPose.indexTip, rPose.wrist, rPose.indexTip);
      }
      scene.render();
    });

    const handleResize = () => {
      if (containerRef.current && sceneRef.current) {
        sceneRef.current.resize(containerRef.current.clientWidth, containerRef.current.clientHeight);
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      scene.renderer.setAnimationLoop(null);
      scene.cleanup();
    };
  }, []);

  // Update cards in 3D world when React state changes
  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.updateCards(playerHand, middleCards, players, localSeatIndex);
    }
  }, [playerHand, middleCards, players, localSeatIndex]);

  // Update seated 3D avatars when players or turns change
  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.updateAvatars(players, currentTurnSeat, trumpSuit);
    }
  }, [players, currentTurnSeat, trumpSuit]);

  return <div ref={containerRef} className="absolute inset-0 w-full h-full overflow-hidden" />;
};
