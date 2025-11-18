package eticaret.demo.contact_us;

import eticaret.demo.common.response.ResponseMessage;
import jakarta.validation.Valid;

public interface ContactUsServis {
    ResponseMessage gonder(@Valid ContactUsMessage message);
    ResponseMessage verifyEmail(String verificationData);
    ResponseMessage getAllMessages();
    ResponseMessage respondToMessage(Long messageId, String response);
}