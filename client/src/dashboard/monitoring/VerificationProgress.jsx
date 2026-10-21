import {verificationPercent} from './verification-progress';
export default function VerificationProgress({verified,total}){
  const percent=verificationPercent(verified,total),label=percent.toLocaleString('vi-VN',{maximumFractionDigits:1})+'%';
  return <div className={`verification-progress ${percent>80?'is-complete':'is-incomplete'}`} title={`Đã xác minh ${verified}/${total}`}>
    <div role="progressbar" aria-label="Tỷ lệ xác minh" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Number(percent.toFixed(1))} aria-valuetext={label}><i style={{width:percent+'%'}}/></div><strong>{label}</strong>
  </div>;
}
