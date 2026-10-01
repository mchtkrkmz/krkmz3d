import * as THREE from 'three';
import { HandPose, HeadPose } from '../types';

export interface WebXRCallbacks {
  onSessionStart?: (session: XRSession) => void;
  onSessionEnd?: () => void;
  onPinchCard?: (hand: 'left' | 'right', position: THREE.Vector3, isPinching: boolean) => void;
  onTelemetrySample?: (telemetry: {
    pinchCount: number;
    hapticCount: number;
    leftWrist?: [number, number, number];
    rightWrist?: [number, number, number];
    pinchDistLeft?: number;
    pinchDistRight?: number;
  }) => void;
}

export class WebXRManager {
  private renderer: THREE.WebGLRenderer;
  private session: XRSession | null = null;
  private refSpace: XRReferenceSpace | null = null;
  private isVRSupported: boolean = false;
  private callbacks: WebXRCallbacks = {};

  // Hand tracking state
  private leftHandPose: HandPose = { isTracking: false, isPinching: false, pinchStrength: 0 };
  private rightHandPose: HandPose = { isTracking: false, isPinching: false, pinchStrength: 0 };
  private headPose: HeadPose = { x: 0, y: 1.2, z: 0.8, rx: 0, ry: 0, rz: 0 };

  // Telemetry counters
  private pinchCounter = 0;
  private hapticCounter = 0;
  private lastTelemetryTime = 0;

  constructor(renderer: THREE.WebGLRenderer, callbacks: WebXRCallbacks = {}) {
    this.renderer = renderer;
    this.callbacks = callbacks;
    this.checkVRSupport();
  }

  private async checkVRSupport() {
    if ('xr' in navigator && navigator.xr) {
      try {
        this.isVRSupported = await navigator.xr.isSessionSupported('immersive-vr');
      } catch {
        this.isVRSupported = false;
      }
    }
  }

  public getIsVRSupported(): boolean {
    return this.isVRSupported;
  }

  public getSession(): XRSession | null {
    return this.session;
  }

  public async enterVR(): Promise<boolean> {
    if (!('xr' in navigator) || !navigator.xr) return false;

    try {
      const session = await navigator.xr.requestSession('immersive-vr', {
        optionalFeatures: ['local-floor', 'bounded-floor', 'hand-tracking', 'layers'],
      });

      this.session = session;
      this.renderer.xr.enabled = true;
      await this.renderer.xr.setSession(session);

      try {
        this.refSpace = await session.requestReferenceSpace('local-floor');
      } catch {
        this.refSpace = await session.requestReferenceSpace('local');
      }

      session.addEventListener('end', () => {
        this.session = null;
        this.refSpace = null;
        this.renderer.xr.enabled = false;
        if (this.callbacks.onSessionEnd) this.callbacks.onSessionEnd();
      });

      if (this.callbacks.onSessionStart) {
        this.callbacks.onSessionStart(session);
      }
      return true;
    } catch (err) {
      console.error('Failed to start WebXR session:', err);
      return false;
    }
  }

  public exitVR() {
    if (this.session) {
      this.session.end();
    }
  }

  public updateXRFrame(frame: XRFrame, _time: number) {
    if (!this.session || !this.refSpace) return;

    // 1. Head Pose (Viewer)
    const viewerPose = frame.getViewerPose(this.refSpace);
    if (viewerPose) {
      const t = viewerPose.transform.position;
      const o = viewerPose.transform.orientation;
      const euler = new THREE.Euler().setFromQuaternion(new THREE.Quaternion(o.x, o.y, o.z, o.w));
      this.headPose = {
        x: t.x,
        y: t.y,
        z: t.z,
        rx: euler.x,
        ry: euler.y,
        rz: euler.z,
      };
    }

    // 2. Hand Tracking (Quest 3 native joints)
    let leftPinchDist = 1;
    let rightPinchDist = 1;
    let leftWristPos: [number, number, number] | undefined;
    let rightWristPos: [number, number, number] | undefined;

    for (const inputSource of this.session.inputSources) {
      const handedness = inputSource.handedness as 'left' | 'right';
      const hand = inputSource.hand;

      if (hand) {
        // Quest 3 Hand Tracking is active!
        const wristJoint = hand.get('wrist');
        const thumbTipJoint = hand.get('thumb-tip');
        const indexTipJoint = hand.get('index-finger-tip');

        if (wristJoint && thumbTipJoint && indexTipJoint) {
          const wristPose = frame.getJointPose ? frame.getJointPose(wristJoint, this.refSpace) : null;
          const thumbPose = frame.getJointPose ? frame.getJointPose(thumbTipJoint, this.refSpace) : null;
          const indexPose = frame.getJointPose ? frame.getJointPose(indexTipJoint, this.refSpace) : null;

          if (wristPose && thumbPose && indexPose) {
            const wristVec = new THREE.Vector3(wristPose.transform.position.x, wristPose.transform.position.y, wristPose.transform.position.z);
            const thumbVec = new THREE.Vector3(thumbPose.transform.position.x, thumbPose.transform.position.y, thumbPose.transform.position.z);
            const indexVec = new THREE.Vector3(indexPose.transform.position.x, indexPose.transform.position.y, indexPose.transform.position.z);

            const pinchDist = thumbVec.distanceTo(indexVec);
            const isPinching = pinchDist < 0.028; // 2.8cm threshold
            const pinchStrength = THREE.MathUtils.clamp(1 - pinchDist / 0.05, 0, 1);

            const midPinch = new THREE.Vector3().addVectors(thumbVec, indexVec).multiplyScalar(0.5);

            if (handedness === 'left') {
              leftPinchDist = pinchDist;
              leftWristPos = [wristVec.x, wristVec.y, wristVec.z];
              if (!this.leftHandPose.isPinching && isPinching) {
                this.pinchCounter++;
                this.triggerHaptic(0.5, 30);
              }
              this.leftHandPose = {
                isTracking: true,
                isPinching,
                pinchStrength,
                wrist: leftWristPos,
                indexTip: [indexVec.x, indexVec.y, indexVec.z],
                thumbTip: [thumbVec.x, thumbVec.y, thumbVec.z],
              };
              if (this.callbacks.onPinchCard) {
                this.callbacks.onPinchCard('left', midPinch, isPinching);
              }
            } else if (handedness === 'right') {
              rightPinchDist = pinchDist;
              rightWristPos = [wristVec.x, wristVec.y, wristVec.z];
              if (!this.rightHandPose.isPinching && isPinching) {
                this.pinchCounter++;
                this.triggerHaptic(0.5, 30);
              }
              this.rightHandPose = {
                isTracking: true,
                isPinching,
                pinchStrength,
                wrist: rightWristPos,
                indexTip: [indexVec.x, indexVec.y, indexVec.z],
                thumbTip: [thumbVec.x, thumbVec.y, thumbVec.z],
              };
              if (this.callbacks.onPinchCard) {
                this.callbacks.onPinchCard('right', midPinch, isPinching);
              }
            }
          }
        }
      } else if (inputSource.gamepad) {
        // Fallback: Quest 3 Touch Controllers trigger pinch when grip/trigger pressed
        const gp = inputSource.gamepad;
        const trigger = gp.buttons[0]?.pressed || false;
        const grip = gp.buttons[1]?.pressed || false;
        const isGrabbing = trigger || grip;

        if (handedness === 'right') {
          if (!this.rightHandPose.isPinching && isGrabbing) {
            this.pinchCounter++;
            this.triggerHaptic(0.6, 40);
          }
          this.rightHandPose.isPinching = isGrabbing;
          this.rightHandPose.isTracking = true;
        } else if (handedness === 'left') {
          if (!this.leftHandPose.isPinching && isGrabbing) {
            this.pinchCounter++;
            this.triggerHaptic(0.6, 40);
          }
          this.leftHandPose.isPinching = isGrabbing;
          this.leftHandPose.isTracking = true;
        }
      }
    }

    // Periodically sample telemetry (every 2.5 seconds) for Firestore logging
    const now = Date.now();
    if (now - this.lastTelemetryTime > 2500) {
      this.lastTelemetryTime = now;
      if (this.callbacks.onTelemetrySample) {
        this.callbacks.onTelemetrySample({
          pinchCount: this.pinchCounter,
          hapticCount: this.hapticCounter,
          leftWrist: leftWristPos,
          rightWrist: rightWristPos,
          pinchDistLeft: leftPinchDist,
          pinchDistRight: rightPinchDist,
        });
      }
    }
  }

  public triggerHaptic(intensity: number = 0.6, durationMs: number = 40) {
    if (!this.session) return;
    this.hapticCounter++;
    try {
      for (const source of this.session.inputSources) {
        if (source.gamepad && source.gamepad.hapticActuators && source.gamepad.hapticActuators.length > 0) {
          const actuator = source.gamepad.hapticActuators[0] as unknown as { pulse: (v: number, d: number) => Promise<boolean> };
          if (typeof actuator.pulse === 'function') {
            actuator.pulse(intensity, durationMs);
          }
        }
      }
    } catch {
      // Ignored
    }
  }

  public getHeadPose(): HeadPose {
    return this.headPose;
  }

  public getLeftHandPose(): HandPose {
    return this.leftHandPose;
  }

  public getRightHandPose(): HandPose {
    return this.rightHandPose;
  }
}
