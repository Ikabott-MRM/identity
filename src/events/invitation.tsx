import * as React from 'react';
import { Html } from '@react-email/html';
import { Button } from '@react-email/button';
import { toDataURL } from 'qrcode';
import { Img } from '@react-email/components';

interface InvitationProps {
  url: string;
}

export default function Invitation(props: InvitationProps) {
  const { url } = props;

  return (
    <Html lang="en">
      <Img src={url} alt="Invitation QR Code" />
    </Html>
  );
}
