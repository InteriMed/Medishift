'use client';

import { useEffect, useState } from 'react';
import { ImageTheater } from './media_visualization/ImageTheater';
import { AudioVisualizer } from './media_visualization/AudioVisualizer';
import { Storyboard } from './Storyboard';
import { UpgradePopup } from '@/app/dashboard/pricing/components/UpgradePopup';

interface UIDesign {
  ui_design_id: string;
  name: string;
  type: 'modal' | 'page';
  component: string;
  props: Record<string, any>;
  metadata?: Record<string, any>;
}

interface ActionHandlerProps {
  actions?: Array<{
    id: string;
    action_type: string;
    action_status?: 'pending' | 'processing' | 'completed' | 'failed';
    response_payload?: {
      ui_design?: UIDesign;
      props?: Record<string, any>;
    } | null;
  }>;
  projectId?: string | null;
}

export function ActionHandler({ actions, projectId }: ActionHandlerProps) {
  const [activeActions, setActiveActions] = useState<Map<string, any>>(
    new Map()
  );

  useEffect(() => {
    if (!actions) return;

    const newActiveActions = new Map<string, any>();

    actions.forEach(action => {
      if (
        action.action_status === 'completed' &&
        action.response_payload?.ui_design
      ) {
        const uiDesign = action.response_payload.ui_design;
        const props = action.response_payload.props || {};

        if (uiDesign.type === 'modal' || uiDesign.type === 'page') {
          newActiveActions.set(action.id, {
            type: uiDesign.component,
            props: props,
            uiDesign: uiDesign,
          });
        }
      }
    });

    setActiveActions(newActiveActions);
  }, [actions]);

  return (
    <>
      {Array.from(activeActions.entries()).map(([actionId, action]) => {
        const { type, props, uiDesign } = action;

        if (type === 'TheaterMode') {
          return (
            <ImageTheater
              key={actionId}
              open={true}
              onClose={() => {
                setActiveActions(prev => {
                  const next = new Map(prev);
                  next.delete(actionId);
                  return next;
                });
              }}
              imageUrl={props.media_url || props.imageUrl || ''}
              videoUrl={props.video_url || props.videoUrl}
              imageAlt={props.title || props.imageAlt || 'Image'}
              mediaType={props.media_type || props.mediaType}
            />
          );
        }

        if (type === 'AudioVisualizer') {
          return (
            <AudioVisualizer
              key={actionId}
              audioUrl={props.audio_url || props.audioUrl || ''}
              analysis={props.analysis_data || props.analysisData}
            />
          );
        }

        if (type === 'Storyboard' && projectId) {
          return (
            <Storyboard
              key={actionId}
              open={true}
              onClose={() => {
                setActiveActions(prev => {
                  const next = new Map(prev);
                  next.delete(actionId);
                  return next;
                });
              }}
              projectId={props.project_id || props.projectId || projectId}
              sceneId={props.scene_id || props.sceneId}
              generationStep={props.generation_step || props.generationStep}
            />
          );
        }

        if (type === 'UpgradeSubscription') {
          // Construct custom message from props
          const customMessage = props.upgrade_message ? {
            title: "Upgrade Required",
            description: props.upgrade_message,
            cta: "Upgrade Now",
            features: [`Unlock ${props.required_tier || 'premium'} features`]
          } : undefined;

          return (
            <UpgradePopup
              key={actionId}
              isOpen={true}
              onClose={() => {
                setActiveActions(prev => {
                  const next = new Map(prev);
                  next.delete(actionId);
                  return next;
                });
              }}
              origin="chat"
              membership={props.user_tier || 'free'}
              customMessage={customMessage}
            />
          );
        }

        return null;
      })}
    </>
  );
}
